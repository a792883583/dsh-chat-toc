/**
 * DSH 官方 Turn Rail 原生无缝注入增强插件：
 * - 劫持官方悬浮卡片（[class*="preview"]），在卡片内直接注入 ⭐ 收藏与 📋 复制按钮
 * - 在官方导航轨（[class*="frame"]）顶部挂载原生的极简小工具条：
 *   - ⭐ 收藏过滤（在官方轨道上高亮收藏的轮次）
 *   - 🔍 轮次关键词快速搜索
 *   - 📋 一键导出对话 Markdown 大纲
 * - 彻底告别冗余轨道与突兀悬浮大窗，100% 融入 DSH 原生 UI
 * @module dsh-chat-toc/client/index
 */

import type {} from '@deepseek-ai/dsh-client-runtime'
import { initI18n, useT } from './i18n.ts'

interface ClientContext {
  effect(fn: () => (() => void) | void, name: string): void
  locale?: {
    getLocale(): { active: string }
    subscribe(fn: () => void): () => void
  }
}

export const inject = ['locale']

const STYLE = `
/* 官方悬浮预览卡片内的操作条 */
[class*="preview"] {
  position: relative !important;
  min-width: 240px;
}
.dsh-native-preview-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(128, 128, 128, 0.12);
  backdrop-filter: blur(8px);
  padding: 2px 4px;
  border-radius: 6px;
  z-index: 10;
}
.dsh-native-preview-btn {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #8b949e);
  cursor: pointer;
  padding: 3px;
  border-radius: 4px;
  line-height: 0;
  transition: all 0.12s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dsh-native-preview-btn:hover {
  background: rgba(128, 128, 128, 0.2);
  color: var(--dsw-alias-label-primary, currentColor);
}
.dsh-native-preview-btn.starred {
  color: #eab308;
}

/* 官方轨道顶部的原生小工具条：随着官方小地图顶部自然定位 */
.dsh-rail-toolbar {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--dsw-alias-surface-overlay, rgba(128,128,128,0.12));
  border: 1px solid var(--dsw-alias-border-l4, rgba(128,128,128,0.2));
  border-radius: 6px;
  padding: 2px 3px;
  backdrop-filter: blur(12px);
  z-index: 99;
}
.dsh-rail-tool-btn {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #8b949e);
  cursor: pointer;
  padding: 3px;
  border-radius: 4px;
  line-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
}
.dsh-rail-tool-btn:hover {
  background: rgba(128, 128, 128, 0.2);
  color: var(--dsw-alias-label-primary, currentColor);
}
.dsh-rail-tool-btn.active {
  color: #eab308;
  background: rgba(234, 179, 8, 0.15);
}

/* 搜索小浮层 */
.dsh-rail-search-box {
  position: absolute;
  bottom: calc(100% + 40px);
  right: 0;
  width: 220px;
  background: var(--dsw-alias-surface-overlay, #ffffff);
  border: 1px solid var(--dsw-alias-border-l4, rgba(128,128,128,0.25));
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  padding: 6px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 4px;
}
[data-ds-dark-theme] .dsh-rail-search-box,
[data-theme="dark"] .dsh-rail-search-box,
html.dark .dsh-rail-search-box {
  background: #1f2937;
}
.dsh-rail-search-input {
  flex: 1;
  border: 1px solid var(--dsw-alias-border-l4, rgba(128,128,128,0.2));
  background: transparent;
  color: currentColor;
  font-size: 12px;
  padding: 4px 6px;
  border-radius: 4px;
  outline: none;
}
.dsh-rail-search-input:focus {
  border-color: #3b82f6;
}

/* 当开启收藏过滤时，未收藏的 mark 淡化，已收藏的 mark 变金黄色 */
.dsh-filter-starred [class*="mark"]:not(.dsh-mark-starred):before {
  opacity: 0.15 !important;
}
[class*="mark"].dsh-mark-starred:before {
  background: #eab308 !important;
  width: 20px !important;
}
`

let styleInjected = false
function ensureStyle(): void {
  if (styleInjected) return
  styleInjected = true
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-chat-toc-native'
  tag.textContent = STYLE
  document.head.appendChild(tag)
}

export function apply(ctx: ClientContext): void {
  if (ctx.locale) {
    try {
      initI18n(ctx.locale)
    } catch {}
  }

  ensureStyle()

  ctx.effect(() => {
    let disposed = false

    const getStarred = (): Set<string> => {
      try {
        const raw = window.localStorage.getItem('dsh-toc-starred')
        return raw !== null ? new Set(JSON.parse(raw)) : new Set()
      } catch {
        return new Set()
      }
    }

    const setStarred = (set: Set<string>): void => {
      try {
        window.localStorage.setItem('dsh-toc-starred', JSON.stringify([...set]))
      } catch {}
    }

    let starOnly = false
    let searchOpen = false
    let searchQuery = ''

    // 1. 劫持官方预览卡片：右上角直接嵌入 ⭐ 收藏 与 📋 复制
    const enhancePreviewCard = (card: HTMLElement) => {
      if (card.querySelector('.dsh-native-preview-actions') !== null) return

      const promptEl = card.querySelector('[class*="previewPrompt"]')
      const textKey = (promptEl?.textContent || card.textContent || '').trim().slice(0, 40)
      if (!textKey) return

      const actions = document.createElement('div')
      actions.className = 'dsh-native-preview-actions'

      // ⭐ 收藏按钮
      const starBtn = document.createElement('button')
      starBtn.className = 'dsh-native-preview-btn'
      const isStarred = getStarred().has(textKey)
      if (isStarred) starBtn.classList.add('starred')
      starBtn.title = isStarred ? '取消收藏' : '收藏此条'
      starBtn.innerHTML = `
        <svg viewBox="0 0 16 16" width="13" height="13" fill="${isStarred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round">
          <path d="M8 2l1.7 3.6 4 .5-2.9 2.8.7 4L8 11.2 4.5 12.9l.7-4L2.3 6.1l4-.5z"/>
        </svg>
      `
      starBtn.onclick = (e) => {
        e.stopPropagation()
        const set = getStarred()
        if (set.has(textKey)) {
          set.delete(textKey)
          starBtn.classList.remove('starred')
          starBtn.title = '收藏此条'
          starBtn.querySelector('svg')?.setAttribute('fill', 'none')
        } else {
          set.add(textKey)
          starBtn.classList.add('starred')
          starBtn.title = '取消收藏'
          starBtn.querySelector('svg')?.setAttribute('fill', 'currentColor')
        }
        setStarred(set)
        updateRailMarks()
      }
      actions.appendChild(starBtn)

      // 📋 复制内容按钮
      const copyBtn = document.createElement('button')
      copyBtn.className = 'dsh-native-preview-btn'
      copyBtn.title = '复制提问与内容'
      copyBtn.innerHTML = `
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="5" y="5" width="8" height="9" rx="1.5"/>
          <path d="M3 11V3.5A1.5 1.5 0 014.5 2H10"/>
        </svg>
      `
      copyBtn.onclick = (e) => {
        e.stopPropagation()
        const text = (card.textContent || '').trim()
        if (navigator?.clipboard?.writeText) {
          void navigator.clipboard.writeText(text).then(() => {
            copyBtn.style.color = '#16a34a'
            setTimeout(() => { copyBtn.style.color = '' }, 1500)
          })
        }
      }
      actions.appendChild(copyBtn)

      card.appendChild(actions)
    }

    // 2. 根据收藏状态与搜索状态，高亮官方轨道上的 mark
    const updateRailMarks = () => {
      const rail = document.querySelector<HTMLElement>('[class*="frame"]')
      if (!rail) return

      if (starOnly) {
        rail.classList.add('dsh-filter-starred')
      } else {
        rail.classList.remove('dsh-filter-starred')
      }

      const starred = getStarred()
      const marks = rail.querySelectorAll<HTMLElement>('[class*="mark"]')
      marks.forEach((mark) => {
        const title = mark.getAttribute('title') || mark.getAttribute('aria-label') || ''
        const isStar = [...starred].some((s) => title.includes(s))
        if (isStar) {
          mark.classList.add('dsh-mark-starred')
        } else {
          mark.classList.remove('dsh-mark-starred')
        }
      })
    }

    // 3. 在官方轨道顶部注入极简小工具条
    const injectRailToolbar = () => {
      const rail = document.querySelector<HTMLElement>('[class*="frame"]')
      if (!rail) return

      let toolbar = rail.querySelector<HTMLElement>('.dsh-rail-toolbar')
      if (toolbar === null) {
        toolbar = document.createElement('div')
        toolbar.className = 'dsh-rail-toolbar'

        // 🌟 仅看收藏切换
        const starToggle = document.createElement('button')
        starToggle.className = 'dsh-rail-tool-btn'
        starToggle.title = '过滤收藏'
        starToggle.innerHTML = `
          <svg viewBox="0 0 16 16" width="13" height="13" fill="${starOnly ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round">
            <path d="M8 2l1.7 3.6 4 .5-2.9 2.8.7 4L8 11.2 4.5 12.9l.7-4L2.3 6.1l4-.5z"/>
          </svg>
        `
        starToggle.onclick = (e) => {
          e.stopPropagation()
          starOnly = !starOnly
          starToggle.classList.toggle('active', starOnly)
          starToggle.querySelector('svg')?.setAttribute('fill', starOnly ? 'currentColor' : 'none')
          updateRailMarks()
        }
        toolbar.appendChild(starToggle)

        // 🔍 快速搜索
        const searchBtn = document.createElement('button')
        searchBtn.className = 'dsh-rail-tool-btn'
        searchBtn.title = '搜索消息'
        searchBtn.innerHTML = `
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="7" cy="7" r="4.5"/>
            <path d="M10.5 10.5L14 14"/>
          </svg>
        `
        searchBtn.onclick = (e) => {
          e.stopPropagation()
          searchOpen = !searchOpen
          renderSearchBox(rail)
        }
        toolbar.appendChild(searchBtn)

        // 📋 导出 Markdown 大纲
        const exportBtn = document.createElement('button')
        exportBtn.className = 'dsh-rail-tool-btn'
        exportBtn.title = '导出对话 Markdown 大纲'
        exportBtn.innerHTML = `
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="5" width="8" height="9" rx="1.5"/>
            <path d="M3 11V3.5A1.5 1.5 0 014.5 2H10"/>
          </svg>
        `
        exportBtn.onclick = (e) => {
          e.stopPropagation()
          const rows = document.querySelectorAll<HTMLElement>('[data-chat-anchor-key]')
          const lines: string[] = []
          rows.forEach((row, i) => {
            const kind = row.dataset.chatFlowKind === 'user' ? '👤 User' : '🤖 Assistant'
            const text = (row.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100)
            if (text) lines.push(`${i + 1}. **${kind}**: ${text}`)
          })
          const md = `# 对话结构大纲\n\n共 ${lines.length} 轮消息：\n\n${lines.join('\n')}\n`
          if (navigator?.clipboard?.writeText) {
            void navigator.clipboard.writeText(md).then(() => {
              exportBtn.style.color = '#16a34a'
              setTimeout(() => { exportBtn.style.color = '' }, 1500)
            })
          }
        }
        toolbar.appendChild(exportBtn)

        rail.appendChild(toolbar)
      }
    }

    const renderSearchBox = (rail: HTMLElement) => {
      let box = rail.querySelector<HTMLElement>('.dsh-rail-search-box')
      if (!searchOpen) {
        box?.remove()
        return
      }
      if (!box) {
        box = document.createElement('div')
        box.className = 'dsh-rail-search-box'
        box.innerHTML = `
          <input type="text" class="dsh-rail-search-input" placeholder="搜索轮次..." value="${searchQuery}" />
          <button class="dsh-rail-tool-btn" style="padding:2px">✕</button>
        `
        const input = box.querySelector<HTMLInputElement>('input')!
        const close = box.querySelector<HTMLButtonElement>('button')!
        input.oninput = () => {
          searchQuery = input.value.trim().toLowerCase()
          if (searchQuery) {
            const rows = document.querySelectorAll<HTMLElement>('[data-chat-anchor-key]')
            for (const r of rows) {
              if ((r.textContent || '').toLowerCase().includes(searchQuery)) {
                r.scrollIntoView({ behavior: 'smooth', block: 'center' })
                break
              }
            }
          }
        }
        close.onclick = () => {
          searchOpen = false
          box?.remove()
        }
        rail.appendChild(box)
        input.focus()
      }
    }

    const observer = new MutationObserver(() => {
      if (disposed) return
      injectRailToolbar()
      updateRailMarks()
      const cards = document.querySelectorAll<HTMLElement>('[class*="preview"]')
      cards.forEach(enhancePreviewCard)
    })
    observer.observe(document.body, { childList: true, subtree: true })

    const interval = window.setInterval(() => {
      if (disposed) return
      injectRailToolbar()
      updateRailMarks()
    }, 1500)

    return () => {
      disposed = true
      observer.disconnect()
      window.clearInterval(interval)
      document.querySelector('.dsh-rail-toolbar')?.remove()
      document.querySelector('.dsh-rail-search-box')?.remove()
    }
  }, 'dsh-chat-toc: native augment')
}

export default { apply, inject }
