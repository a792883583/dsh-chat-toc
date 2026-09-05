/**
 * DSH 官方 Turn Rail 原生增强插件：
 * - 零破坏性：不修改官方卡片的任何尺寸与定位属性，彻底避免页面横向撑开产生滚动条
 * - 在官方预览卡片内部底部添加轻巧的操作栏（⭐ 收藏、📋 复制）
 * - 在官方导航轨上方集成极简工具胶囊
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
/* 绝不碰 [class*="preview"] 的 position / width / min-width，保持官方原装计算 */
.dsh-card-action-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 6px;
  padding-top: 4px;
  border-top: 1px solid rgba(128, 128, 128, 0.15);
  font-size: 11px;
}
.dsh-card-action-btn {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #8b949e);
  cursor: pointer;
  padding: 2px 5px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  line-height: 1;
  transition: all 0.1s ease;
  font-size: 11px;
}
.dsh-card-action-btn:hover {
  background: rgba(128, 128, 128, 0.15);
  color: var(--dsw-alias-label-primary, currentColor);
}
.dsh-card-action-btn.starred {
  color: #eab308;
  font-weight: 600;
}

/* 官方轨道顶部小胶囊，不产生任何横向溢出 */
.dsh-rail-toolbar {
  position: absolute;
  bottom: calc(100% + 6px);
  right: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(128, 128, 128, 0.1);
  border: 1px solid rgba(128, 128, 128, 0.2);
  border-radius: 6px;
  padding: 1px 2px;
  backdrop-filter: blur(8px);
  z-index: 10;
  overflow: hidden;
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
}
.dsh-rail-tool-btn:hover {
  background: rgba(128, 128, 128, 0.2);
  color: currentColor;
}
.dsh-rail-tool-btn.active {
  color: #eab308;
}

/* 收藏高亮 */
[class*="mark"].dsh-mark-starred:before {
  background: #eab308 !important;
  width: 18px !important;
}
.dsh-filter-starred [class*="mark"]:not(.dsh-mark-starred):before {
  opacity: 0.15 !important;
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

    // 在官方卡片内部末尾追加操作栏
    const enhancePreviewCard = (card: HTMLElement) => {
      if (card.querySelector('.dsh-card-action-row') !== null) return

      const promptEl = card.querySelector('[class*="previewPrompt"]')
      const textKey = (promptEl?.textContent || card.textContent || '').trim().slice(0, 40)
      if (!textKey) return

      const row = document.createElement('div')
      row.className = 'dsh-card-action-row'

      // ⭐ 收藏
      const starBtn = document.createElement('button')
      starBtn.className = 'dsh-card-action-btn'
      const isStarred = getStarred().has(textKey)
      if (isStarred) starBtn.classList.add('starred')
      starBtn.innerHTML = `
        <svg viewBox="0 0 16 16" width="12" height="12" fill="${isStarred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round">
          <path d="M8 2l1.7 3.6 4 .5-2.9 2.8.7 4L8 11.2 4.5 12.9l.7-4L2.3 6.1l4-.5z"/>
        </svg>
        <span>${isStarred ? '已收藏' : '收藏'}</span>
      `
      starBtn.onclick = (e) => {
        e.stopPropagation()
        const set = getStarred()
        if (set.has(textKey)) {
          set.delete(textKey)
          starBtn.classList.remove('starred')
          starBtn.querySelector('span')!.textContent = '收藏'
          starBtn.querySelector('svg')?.setAttribute('fill', 'none')
        } else {
          set.add(textKey)
          starBtn.classList.add('starred')
          starBtn.querySelector('span')!.textContent = '已收藏'
          starBtn.querySelector('svg')?.setAttribute('fill', 'currentColor')
        }
        setStarred(set)
        updateRailMarks()
      }
      row.appendChild(starBtn)

      // 📋 复制
      const copyBtn = document.createElement('button')
      copyBtn.className = 'dsh-card-action-btn'
      copyBtn.innerHTML = `
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="5" y="5" width="8" height="9" rx="1.5"/>
          <path d="M3 11V3.5A1.5 1.5 0 014.5 2H10"/>
        </svg>
        <span>复制</span>
      `
      copyBtn.onclick = (e) => {
        e.stopPropagation()
        const text = (card.textContent || '').trim()
        if (navigator?.clipboard?.writeText) {
          void navigator.clipboard.writeText(text).then(() => {
            copyBtn.querySelector('span')!.textContent = '已复制'
            setTimeout(() => {
              if (copyBtn.querySelector('span')) {
                copyBtn.querySelector('span')!.textContent = '复制'
              }
            }, 1500)
          })
        }
      }
      row.appendChild(copyBtn)

      card.appendChild(row)
    }

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

    // 在官方轨道顶部放入极其轻巧的小开关（仅看收藏与导出大纲）
    const injectRailToolbar = () => {
      const rail = document.querySelector<HTMLElement>('[class*="frame"]')
      if (!rail) return

      let toolbar = rail.querySelector<HTMLElement>('.dsh-rail-toolbar')
      if (toolbar === null) {
        toolbar = document.createElement('div')
        toolbar.className = 'dsh-rail-toolbar'

        // 🌟 仅看收藏
        const starToggle = document.createElement('button')
        starToggle.className = 'dsh-rail-tool-btn'
        starToggle.title = '仅高亮收藏的轮次'
        starToggle.innerHTML = `
          <svg viewBox="0 0 16 16" width="12" height="12" fill="${starOnly ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round">
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

        // 📋 导出 Markdown 大纲
        const exportBtn = document.createElement('button')
        exportBtn.className = 'dsh-rail-tool-btn'
        exportBtn.title = '复制整场对话 Markdown 大纲'
        exportBtn.innerHTML = `
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
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
    }
  }, 'dsh-chat-toc: native in-place augment')
}

export default { apply, inject }
