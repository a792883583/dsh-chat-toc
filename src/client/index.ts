/**
 * dsh-chat-toc — 浏览器半区：在聊天区右缘挂载「对话目录」窄条。
 * 探测官方会话 DOM（[data-conversation-scroll] / [data-chat-flow] /
 * [data-chat-anchor-key]），采集消息目录项并渲染；点击目录项滚动到对应消息。
 * 所有接线失败均记录日志而不抛出——插件 apply 抛错会导致整个 shell 启动失败。
 * @module dsh-chat-toc/client
 */

import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { initI18n } from './i18n.ts'
import { TocBar, type TocItem } from './TocBar.tsx'

/** 注入的 client runtime 结构面孔（见 git-panel 同款约定）。 */
interface TocClientContext {
  effect(fn: () => (() => void) | void, name: string): void
  locale: {
    getLocale(): { active: string }
    subscribe(fn: () => void): () => void
  }
}

export const inject = ['locale']

/** 消息流容器选择器（官方会话 DOM 标记，见 dsh-client-ui-conversation）。 */
const FLOW_SELECTOR = '[data-chat-flow]'
/** 滚动容器选择器（同时是定位与滚动目标）。 */
const SCROLL_SELECTOR = '[data-conversation-scroll]'
/** 单条消息选择器。 */
const ITEM_SELECTOR = '[data-chat-anchor-key]'

/** 摘要文本最长字符数。 */
const SUMMARY_MAX = 80
/** 文本兜底刷新间隔（流式输出期间消息文本持续变化；低频避免常驻开销）。 */
const REFRESH_MS = 1500

/** Apply the browser half. */
export function apply(ctx: TocClientContext): void {
  try {
    initI18n(ctx.locale)
  } catch (error) {
    console.error('dsh-chat-toc: i18n init failed (falling back to Chinese)', error)
  }

  ctx.effect(() => {
    const host = document.createElement('div')
    host.dataset.tocHost = ''
    document.body.appendChild(host)
    const root: Root = createRoot(host)
    let disposed = false

    let flow: HTMLElement | null = null
    let scrollEl: HTMLElement | null = null
    let items: TocItem[] = []
    let observer: MutationObserver | null = null
    let interval = 0

    const render = (): void => {
      if (disposed || scrollEl === null) return
      root.render(createElement(TocBar, { scrollEl, items }))
    }

    /** 全量重采目录项；仅在内容变化时重渲染（React diff 按 key 复用）。 */
    // 用 rAF 合并连续变更（打开会话时 DOM 批量重建，避免每帧全量提取文本）。
    let collectRaf = 0
    const collect = (): void => {
      if (collectRaf !== 0) return
      collectRaf = requestAnimationFrame(() => {
        collectRaf = 0
        if (flow === null) return
        const seen = new Set<string>()
        const next: TocItem[] = []
        flow.querySelectorAll<HTMLElement>(ITEM_SELECTOR).forEach((el) => {
          const key = el.dataset.chatAnchorKey ?? ''
          if (key === '' || seen.has(key)) return
          seen.add(key)
          // 探测消息特征（是否含代码块 / 工具调用 / 错误）
          let tag: TocItem['tag']
          if (el.querySelector('pre, code, [class*=code], [class*=Code]')) {
            tag = 'code'
          } else if (el.querySelector('[data-tool-call], [class*=tool], [class*=Tool]')) {
            tag = 'tool'
          } else if (el.querySelector('[class*=error], [class*=Error], [class*=danger], [class*=Danger]')) {
            tag = 'error'
          }
          next.push({
            key,
            kind: el.dataset.chatFlowKind ?? '',
            text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, SUMMARY_MAX),
            el,
            tag,
          })
        })
        const changed =
          next.length !== items.length ||
          next.some((item, index) => {
            const prev = items[index]
            return prev === undefined || prev.key !== item.key || prev.text !== item.text
          })
        if (!changed) return
        items = next
        render()
      })
    }

    /** 绑定消息流容器（会话切换 / 组件重建后重新绑定）。 */
    const attach = (): void => {
      const nextFlow = document.querySelector<HTMLElement>(FLOW_SELECTOR)
      if (nextFlow === null || nextFlow === flow) return
      flow = nextFlow
      scrollEl = flow.closest<HTMLElement>(SCROLL_SELECTOR) ?? flow
      observer?.disconnect()
      observer = new MutationObserver(() => collect())
      observer.observe(flow, { childList: true, subtree: false })
      collect()
      console.debug('[dsh-chat-toc] attached', { flow, scrollEl })
    }

    // 轮询等待会话 DOM 出现；attach 成功后停止（interval 兜底负责重建检测）。
    let raf = 0
    let polling = true
    const poll = (): void => {
      if (disposed || !polling) return
      attach()
      if (flow === null) {
        raf = requestAnimationFrame(poll)
      } else {
        polling = false
      }
    }
    raf = requestAnimationFrame(poll)

    // 兜底：流式输出文本刷新 + flow 重建检测（低频，避免常驻开销）。
    interval = window.setInterval(() => {
      if (disposed) return
      if (flow !== null && !flow.isConnected) {
        flow = null
        scrollEl = null
        observer?.disconnect()
        observer = null
        polling = true
        raf = requestAnimationFrame(poll)
        items = []
        attach()
        render()
        return
      }
      collect()
    }, REFRESH_MS)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      if (collectRaf !== 0) cancelAnimationFrame(collectRaf)
      window.clearInterval(interval)
      observer?.disconnect()
      try {
        root.unmount()
      } catch {
        /* 忽略 */
      }
      host.remove()
    }
  }, 'dsh-chat-toc: mount')
}

/** Cordis plugin entry — named + default export so the loader always resolves it. */
export default { apply, inject }
