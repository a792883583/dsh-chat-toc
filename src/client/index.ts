/**
 * DSH 官方 Turn Rail 原生深度增强插件:
 * - 紧邻 Session 日志按钮：直接挂载在右上角操作栏流内，与 Session 日志同排，彻底消灭双滚动条与任何错位！
 * - 智能提取用户提问 + AI 核心回答：呈现完整卡片双向预览，300ms 悬停防抖不闪退
 * - 永久持久化：基于会话 ID (Session ID) + 消息全局稳定指纹 (chatAnchorKey)
 * - 顶部极简扁平工具胶囊：🔍 搜索、⭐ 收藏过滤、📋 导出 Markdown 大纲
 * @module dsh-chat-toc/client/index
 */

import type {} from '@deepseek-ai/dsh-client-runtime'
import { initI18n } from './i18n.ts'

interface ClientContext {
  effect(fn: () => (() => void) | void, name: string): void
  locale?: {
    getLocale(): { active: string }
    subscribe(fn: () => void): () => void
  }
}

export const inject = ['locale']

const STYLE = `
/* 1. 隐藏官方原生脆弱卡片 */
[class*="_preview"] {
  display: none !important;
}

/* 2. 精美自主悬停卡片 */
.dsh-enhanced-preview-card {
  position: fixed;
  z-index: 1000;
  width: 300px;
  background: var(--dsw-alias-surface-overlay, #ffffff);
  border: 1px solid var(--dsw-alias-border-l4, rgba(128, 128, 128, 0.22));
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 10px 12px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: var(--dsw-alias-label-primary, #24292f);
  font-size: 12px;
  line-height: 1.45;
  pointer-events: auto;
  transition: opacity 0.15s ease, transform 0.15s ease;
  transform: translateY(-50%);
  animation: dshPreviewIn 0.12s ease-out;
}
@keyframes dshPreviewIn {
  from { opacity: 0; transform: translateY(-50%) translateX(4px); }
  to { opacity: 1; transform: translateY(-50%) translateX(0); }
}

[data-ds-dark-theme] .dsh-enhanced-preview-card,
[data-theme="dark"] .dsh-enhanced-preview-card,
html.dark .dsh-enhanced-preview-card {
  background: #1f2937;
  color: #f3f4f6;
  border-color: rgba(255, 255, 255, 0.12);
}

.dsh-enhanced-preview-prompt {
  font-weight: 600;
  font-size: 12.5px;
  color: var(--dsw-alias-label-primary, currentColor);
  margin-bottom: 5px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}
.dsh-enhanced-preview-response {
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary, #6e7781);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
  line-height: 1.4;
  margin-top: 4px;
}
[data-ds-dark-theme] .dsh-enhanced-preview-response,
[data-theme="dark"] .dsh-enhanced-preview-response,
html.dark .dsh-enhanced-preview-response {
  color: #9ca3af;
}

/* 卡片底部操作栏 */
.dsh-card-action-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(128, 128, 128, 0.15);
  font-size: 11px;
}
.dsh-card-action-btn {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #8b949e);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
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

/* 3. 紧邻 Session 日志按钮排列的轻量工具条：100% 消除双滚动条与错位 */
.dsh-top-capsule {
  display: inline-flex;
  align-items: center;
  background: var(--dsw-alias-surface-overlay, #ffffff);
  border: 1px solid rgba(128, 128, 128, 0.22);
  border-radius: 8px;
  box-shadow: none !important;
  padding: 2px 4px;
  margin-right: 8px;
  vertical-align: middle;
  pointer-events: auto;
  white-space: nowrap;
}
[data-ds-dark-theme] .dsh-top-capsule,
[data-theme="dark"] .dsh-top-capsule,
html.dark .dsh-top-capsule {
  background: #1f2937;
  border-color: rgba(255, 255, 255, 0.18);
}

.dsh-top-btn {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #6e7781);
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  transition: all 0.12s ease;
}
.dsh-top-btn:hover {
  background: rgba(128, 128, 128, 0.15);
  color: var(--dsw-alias-label-primary, #24292f);
}
[data-ds-dark-theme] .dsh-top-btn:hover,
[data-theme="dark"] .dsh-top-btn:hover,
html.dark .dsh-top-btn:hover {
  color: #f3f4f6;
}
.dsh-top-btn.active {
  color: #eab308;
  background: rgba(234, 179, 8, 0.18);
}

/* 展开的搜索输入条 */
.dsh-top-search-input {
  width: 0;
  opacity: 0;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 12px;
  outline: none;
  transition: width 0.22s ease, opacity 0.15s ease, margin 0.2s ease;
  margin: 0;
  padding: 0;
}
.dsh-top-search-input.expanded {
  width: 130px;
  opacity: 1;
  margin: 0 4px 0 6px;
  padding: 2px 4px;
}

/* 搜索匹配节点：加长发光 */
.dsh-mark-matched:before,
.dsh-mark-matched [class*="mark"]:before,
[class*="markPosition"].dsh-mark-matched [class*="mark"]:before {
  background: #2563eb !important;
  box-shadow: 0 0 8px #2563eb !important;
  width: 22px !important;
  opacity: 1 !important;
}

/* 已收藏的 mark 黄金高亮 */
.dsh-mark-starred:before,
.dsh-mark-starred [class*="mark"]:before,
[class*="mark"].dsh-mark-starred:before,
[class*="markPosition"].dsh-mark-starred [class*="mark"]:before,
.dsh-filter-starred .dsh-mark-starred:before,
.dsh-filter-starred .dsh-mark-starred [class*="mark"]:before,
.dsh-filter-starred [class*="markPosition"].dsh-mark-starred [class*="mark"]:before {
  background: #eab308 !important;
  box-shadow: 0 0 10px rgba(234, 179, 8, 0.95) !important;
  width: 22px !important;
  opacity: 1 !important;
}

/* 过滤模式下，未收藏线条淡化 */
.dsh-filter-starred [class*="markPosition"]:not(.dsh-mark-starred) [class*="mark"]:before,
.dsh-filter-starred [class*="mark"]:not(.dsh-mark-starred):before {
  opacity: 0.08 !important;
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

    const getSessionId = (): string => {
      const match = window.location.pathname.match(/\/session\/([^\/]+)/) ||
                    window.location.hash.match(/session\/([^\/]+)/) ||
                    window.location.href.match(/session-([a-zA-Z0-9_-]+)/)
      return match ? match[1] : 'default-session'
    }

    const getStarredKeys = (): Set<string> => {
      try {
        const sid = getSessionId()
        const raw = window.localStorage.getItem('dsh_bookmarks_v1')
        if (raw !== null) {
          const map = JSON.parse(raw) as Record<string, string[]>
          if (Array.isArray(map[sid])) {
            return new Set(map[sid])
          }
        }
        const legacy = window.localStorage.getItem('dsh-toc-starred')
        return legacy !== null ? new Set(JSON.parse(legacy)) : new Set()
      } catch {
        return new Set()
      }
    }

    const setStarredKeys = (keys: Set<string>): void => {
      try {
        const sid = getSessionId()
        let map: Record<string, string[]> = {}
        const raw = window.localStorage.getItem('dsh_bookmarks_v1')
        if (raw !== null) {
          map = JSON.parse(raw)
        }
        map[sid] = [...keys]
        window.localStorage.setItem('dsh_bookmarks_v1', JSON.stringify(map))
        window.localStorage.setItem('dsh-toc-starred', JSON.stringify([...keys]))
      } catch {}
    }

    let starOnly = false
    let searchExpanded = false
    let searchQuery = ''
    let currentCard: HTMLElement | null = null
    let hideTimer = 0

    // 显示卡片
    const showCard = (turnIndex: number, anchorKey: string, promptText: string, responseText: string, targetY: number, rightDist: number) => {
      window.clearTimeout(hideTimer)
      const stableKey = anchorKey || promptText.trim().slice(0, 40)

      if (currentCard && currentCard.dataset.key === stableKey) {
        currentCard.style.top = `${targetY}px`
        currentCard.style.right = `${rightDist}px`
        return
      }

      currentCard?.remove()

      const card = document.createElement('div')
      card.className = 'dsh-enhanced-preview-card'
      card.dataset.key = stableKey
      card.style.top = `${targetY}px`
      card.style.right = `${rightDist}px`

      card.onmouseenter = () => window.clearTimeout(hideTimer)
      card.onmouseleave = () => scheduleHide()

      const promptEl = document.createElement('div')
      promptEl.className = 'dsh-enhanced-preview-prompt'
      promptEl.textContent = promptText || `第 ${turnIndex + 1} 轮对话`
      card.appendChild(promptEl)

      if (responseText) {
        const respEl = document.createElement('div')
        respEl.className = 'dsh-enhanced-preview-response'
        respEl.textContent = responseText
        card.appendChild(respEl)
      }

      const row = document.createElement('div')
      row.className = 'dsh-card-action-row'

      // ⭐ 收藏按钮
      const starBtn = document.createElement('button')
      starBtn.className = 'dsh-card-action-btn'
      const isStarred = getStarredKeys().has(stableKey)
      if (isStarred) starBtn.classList.add('starred')
      starBtn.innerHTML = `
        <svg viewBox="0 0 16 16" width="12" height="12" fill="${isStarred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round">
          <path d="M8 2l1.7 3.6 4 .5-2.9 2.8.7 4L8 11.2 4.5 12.9l.7-4L2.3 6.1l4-.5z"/>
        </svg>
        <span>${isStarred ? '已收藏' : '收藏'}</span>
      `
      starBtn.onclick = (e) => {
        e.stopPropagation()
        const set = getStarredKeys()
        if (set.has(stableKey)) {
          set.delete(stableKey)
          starBtn.classList.remove('starred')
          starBtn.querySelector('span')!.textContent = '收藏'
          starBtn.querySelector('svg')?.setAttribute('fill', 'none')
        } else {
          set.add(stableKey)
          starBtn.classList.add('starred')
          starBtn.querySelector('span')!.textContent = '已收藏'
          starBtn.querySelector('svg')?.setAttribute('fill', 'currentColor')
        }
        setStarredKeys(set)
        updateRailMarks()
      }
      row.appendChild(starBtn)

      // 📋 复制按钮
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
        const fullText = (promptText + '\n' + responseText).trim()
        if (navigator?.clipboard?.writeText) {
          void navigator.clipboard.writeText(fullText).then(() => {
            copyBtn.querySelector('span')!.textContent = '已复制'
            setTimeout(() => {
              if (copyBtn.querySelector('span')) copyBtn.querySelector('span')!.textContent = '复制'
            }, 1500)
          })
        }
      }
      row.appendChild(copyBtn)

      card.appendChild(row)
      document.body.appendChild(card)
      currentCard = card
    }

    const scheduleHide = () => {
      window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => {
        currentCard?.remove()
        currentCard = null
      }, 300)
    }

    const updateRailMarks = () => {
      const rail = document.querySelector<HTMLElement>('[class*="frame"], [class*="_frame"]')
      if (!rail) return

      if (starOnly) {
        rail.classList.add('dsh-filter-starred')
      } else {
        rail.classList.remove('dsh-filter-starred')
      }

      const starred = getStarredKeys()
      const markItems = Array.from(rail.querySelectorAll<HTMLElement>('[class*="markPosition"], [class*="_markPosition"]'))
      const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-chat-anchor-key]'))

      const promptRows = rows.filter((r) => r.dataset.chatFlowKind === 'user' || r.querySelector('[class*="UserStyleBubble"]'))
      const candidates = promptRows.length > 0 ? promptRows : rows

      markItems.forEach((markEl, i) => {
        let isStar = false
        let isMatch = false

        if (i < candidates.length) {
          const row = candidates[i]
          const anchorKey = row.dataset.chatAnchorKey || ''
          const text = (row.textContent || '').replace(/\s+/g, ' ').trim()
          const textKey = text.slice(0, 40)

          if ((anchorKey && starred.has(anchorKey)) || (textKey && starred.has(textKey))) {
            isStar = true
          }
          if (searchQuery && text.toLowerCase().includes(searchQuery)) {
            isMatch = true
          }
        }

        const innerMark = markEl.querySelector<HTMLElement>('[class*="mark"], [class*="_mark"]') || markEl

        if (isStar) {
          markEl.classList.add('dsh-mark-starred')
          innerMark.classList.add('dsh-mark-starred')
        } else {
          markEl.classList.remove('dsh-mark-starred')
          innerMark.classList.remove('dsh-mark-starred')
        }

        if (isMatch) {
          markEl.classList.add('dsh-mark-matched')
          innerMark.classList.add('dsh-mark-matched')
        } else {
          markEl.classList.remove('dsh-mark-matched')
          innerMark.classList.remove('dsh-mark-matched')
        }
      })
    }

    const extractTurnContent = (activeIdx: number, centerY: number): { key: string; promptText: string; responseText: string } => {
      const allRows = Array.from(document.querySelectorAll<HTMLElement>('[data-chat-anchor-key]'))
      const promptRows = allRows.filter((r) => r.dataset.chatFlowKind === 'user' || r.querySelector('[class*="UserStyleBubble"]'))
      const candidates = promptRows.length > 0 ? promptRows : allRows

      if (candidates.length === 0) return { key: '', promptText: '', responseText: '' }

      const idx = activeIdx >= 0 && activeIdx < candidates.length ? activeIdx : Math.floor((centerY / window.innerHeight) * candidates.length)
      const safeIdx = Math.max(0, Math.min(candidates.length - 1, idx))
      const userRow = candidates[safeIdx]
      const key = userRow.dataset.chatAnchorKey || String(safeIdx)
      const promptText = (userRow.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100)

      let responseText = ''
      const startIndex = allRows.indexOf(userRow)
      if (startIndex >= 0) {
        for (let j = startIndex + 1; j < allRows.length; j++) {
          const nextRow = allRows[j]
          if (nextRow.dataset.chatFlowKind === 'user' || nextRow.querySelector('[class*="UserStyleBubble"]')) {
            break
          }
          const contentEl = nextRow.querySelector<HTMLElement>('[class*="markdown"], [class*="Markdown"], [class*="messageContent"], [class*="bubble"]') || nextRow
          const rawText = (contentEl.textContent || '').replace(/\s+/g, ' ').trim()
          
          if (rawText && rawText.length > 15 && !rawText.startsWith('pwsh -Command') && !rawText.startsWith('read ')) {
            responseText = rawText.slice(0, 160)
            break
          } else if (!responseText && rawText && rawText.length > 5) {
            responseText = rawText.slice(0, 140)
          }
        }
      }

      return { key, promptText, responseText }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (disposed) return
      const target = e.target as HTMLElement | null
      if (!target) return

      if (target.closest('.dsh-enhanced-preview-card') || target.closest('.dsh-top-capsule')) {
        window.clearTimeout(hideTimer)
        return
      }

      const markPos = target.closest<HTMLElement>('[class*="markPosition"], [class*="_markPosition"]')
      const mark = target.closest<HTMLElement>('[class*="mark"], [class*="_mark"]')
      const rail = target.closest<HTMLElement>('[class*="frame"], [class*="_frame"]')

      if ((markPos || mark) && rail) {
        const rect = (markPos || mark || rail).getBoundingClientRect()
        const centerY = rect.top + rect.height / 2
        
        const rightDist = window.innerWidth - rail.getBoundingClientRect().left + 12

        const markElements = Array.from(rail.querySelectorAll<HTMLElement>('[class*="markPosition"], [class*="_markPosition"]'))
        const activeIdx = markPos ? markElements.indexOf(markPos) : markElements.indexOf(mark!.closest('[class*="markPosition"]') || mark!)

        const { key, promptText, responseText } = extractTurnContent(activeIdx, centerY)
        showCard(activeIdx >= 0 ? activeIdx : 0, key, promptText, responseText, centerY, rightDist)
      } else {
        scheduleHide()
      }
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })

    // 4. 插入在 Session 日志 按钮左侧的常规流工具条（绝不死锁、绝不撑破 body）
    const syncTopCapsule = () => {
      // 查找包含 Session 日志 的按钮
      const allButtons = Array.from(document.querySelectorAll<HTMLElement>('button'))
      const logBtn = allButtons.find((b) => (b.textContent || '').includes('Session 日志') || (b.textContent || '').includes('Session') && (b.textContent || '').includes('日志'))
      
      if (!logBtn || !logBtn.parentElement) {
        return
      }

      let capsule = document.querySelector<HTMLElement>('.dsh-top-capsule')
      if (capsule === null) {
        capsule = document.createElement('div')
        capsule.className = 'dsh-top-capsule'

        // 🔍 搜索
        const searchBtn = document.createElement('button')
        searchBtn.className = 'dsh-top-btn'
        searchBtn.title = '搜索对话轮次'
        searchBtn.innerHTML = `
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="7" cy="7" r="4.5"/>
            <path d="M10.5 10.5L14 14"/>
          </svg>
        `

        const searchInput = document.createElement('input')
        searchInput.className = 'dsh-top-search-input'
        searchInput.placeholder = '搜索本页...'
        searchInput.onkeydown = (e) => {
          if (e.key === 'Escape') {
            searchExpanded = false
            searchInput.classList.remove('expanded')
            searchBtn.classList.remove('active')
            searchQuery = ''
            updateRailMarks()
          }
        }
        searchInput.oninput = () => {
          searchQuery = searchInput.value.trim().toLowerCase()
          updateRailMarks()
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

        searchBtn.onclick = (e) => {
          e.stopPropagation()
          searchExpanded = !searchExpanded
          searchInput.classList.toggle('expanded', searchExpanded)
          searchBtn.classList.toggle('active', searchExpanded)
          if (searchExpanded) {
            searchInput.focus()
          } else {
            searchQuery = ''
            updateRailMarks()
          }
        }
        capsule.appendChild(searchBtn)
        capsule.appendChild(searchInput)

        // ⭐ 收藏过滤
        const starBtn = document.createElement('button')
        starBtn.className = 'dsh-top-btn'
        starBtn.title = '仅高亮已收藏轮次'
        starBtn.innerHTML = `
          <svg viewBox="0 0 16 16" width="13" height="13" fill="${starOnly ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round">
            <path d="M8 2l1.7 3.6 4 .5-2.9 2.8.7 4L8 11.2 4.5 12.9l.7-4L2.3 6.1l4-.5z"/>
          </svg>
        `
        starBtn.onclick = (e) => {
          e.stopPropagation()
          starOnly = !starOnly
          starBtn.classList.toggle('active', starOnly)
          starBtn.querySelector('svg')?.setAttribute('fill', starOnly ? 'currentColor' : 'none')
          updateRailMarks()
        }
        capsule.appendChild(starBtn)

        // 📋 导出 Markdown 大纲
        const exportBtn = document.createElement('button')
        exportBtn.className = 'dsh-top-btn'
        exportBtn.title = '复制整场对话大纲为 Markdown'
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
        capsule.appendChild(exportBtn)

        // 插入到 Session 日志 按钮的前面！
        logBtn.parentElement.insertBefore(capsule, logBtn)
      }
    }

    const timer = window.setInterval(() => {
      if (disposed) return
      syncTopCapsule()
      updateRailMarks()
    }, 400)

    return () => {
      disposed = true
      window.removeEventListener('mousemove', onMouseMove)
      window.clearInterval(timer)
      window.clearTimeout(hideTimer)
      currentCard?.remove()
      document.querySelector('.dsh-top-capsule')?.remove()
    }
  }, 'dsh-chat-toc: native in-place augment')
}

export default { apply, inject }
