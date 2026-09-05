/**
 * DSH 原生 Turn Rail 增强大纲面板：
 * 不再重复渲染第二条冗余轨道，而是为官方原生导航轨注入：
 * - 顶部一键展开大纲悬浮按钮
 * - 全局快捷键 Cmd/Ctrl + Shift + O
 * - 实时搜索、加星收藏、导出 Markdown 大纲、Pin 钉住固定
 * - 点击消息平滑跳转
 * @module dsh-chat-toc/client/TocBar
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useT } from './i18n.ts'

/** 一条对话消息的目录项。 */
export interface TocItem {
  key: string
  kind: string
  text: string
  el: HTMLElement
  tag?: 'code' | 'tool' | 'error'
  preview?: string
}

const STYLE = `
.dsh-toc-overlay {
  --toc-fg: #24292f;
  --toc-muted: #6e7781;
  --toc-bg: #ffffff;
  --toc-border: rgba(128, 128, 128, 0.22);
  --toc-hover: rgba(0, 0, 0, 0.05);
  --toc-accent: #2563eb;
  --toc-user: #2563eb;
  --toc-assistant: #16a34a;
  --toc-other: #8b949e;
  position: fixed;
  z-index: 950;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  pointer-events: none;
}
[data-ds-dark-theme] .dsh-toc-overlay,
[data-theme="dark"] .dsh-toc-overlay,
html.dark .dsh-toc-overlay {
  --toc-fg: #f3f4f6;
  --toc-muted: #9ca3af;
  --toc-bg: #1f2937;
  --toc-border: rgba(255, 255, 255, 0.12);
  --toc-hover: rgba(255, 255, 255, 0.08);
  --toc-accent: #3b82f6;
  --toc-user: #3b82f6;
  --toc-assistant: #22c55e;
  --toc-other: #9ca3af;
}
.dsh-toc-overlay * { box-sizing: border-box; }

/* 挂载在官方 Rail 顶部的快捷大纲小胶囊按钮 */
.dsh-toc-trigger {
  position: absolute;
  pointer-events: auto;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--toc-bg);
  border: 1px solid var(--toc-border);
  color: var(--toc-muted);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  transform: translateX(-50%);
}
.dsh-toc-trigger:hover, .dsh-toc-trigger.active {
  color: var(--toc-accent);
  border-color: var(--toc-accent);
  transform: translateX(-50%) scale(1.08);
}

/* 展开的完整大纲面板 */
.dsh-toc-panel {
  position: absolute;
  pointer-events: auto;
  width: 320px;
  max-height: 75vh;
  background: var(--toc-bg);
  border: 1px solid var(--toc-border);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22);
  padding: 10px;
  display: flex;
  flex-direction: column;
  animation: dshTocFadeIn 0.15s ease-out;
}
@keyframes dshTocFadeIn {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.dsh-toc-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px 8px;
  border-bottom: 1px solid var(--toc-border);
  margin-bottom: 8px;
}
.dsh-toc-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--toc-fg);
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}
.dsh-toc-btn {
  border: none;
  background: transparent;
  color: var(--toc-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  transition: background 0.12s, color 0.12s;
}
.dsh-toc-btn:hover { background: var(--toc-hover); color: var(--toc-fg); }
.dsh-toc-btn.active { color: var(--toc-accent); background: var(--toc-hover); }

.dsh-toc-search {
  width: 100%;
  padding: 6px 10px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--toc-fg);
  background: var(--toc-bg);
  border: 1px solid var(--toc-border);
  border-radius: 6px;
  outline: none;
}
.dsh-toc-search:focus { border-color: var(--toc-accent); }
.dsh-toc-search::placeholder { color: var(--toc-muted); }

.dsh-toc-list {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: calc(75vh - 110px);
}
.dsh-toc-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--toc-fg);
  transition: background 0.1s;
}
.dsh-toc-item:hover, .dsh-toc-item.current { background: var(--toc-hover); }
.dsh-toc-item-row { display: flex; align-items: center; gap: 6px; }
.dsh-toc-item .bar {
  flex: none;
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: var(--toc-other);
  opacity: 0.7;
}
.dsh-toc-item .bar.user { background: var(--toc-user); }
.dsh-toc-item .bar.assistant { background: var(--toc-assistant); }
.dsh-toc-item .num {
  flex: none;
  min-width: 18px;
  text-align: right;
  color: var(--toc-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.dsh-toc-badge {
  flex: none;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 4px;
  line-height: 1.2;
  text-transform: uppercase;
}
.dsh-toc-badge.code { background: rgba(59, 130, 246, 0.15); color: var(--toc-accent); }
.dsh-toc-badge.tool { background: rgba(234, 179, 8, 0.15); color: #ca8a04; }
.dsh-toc-badge.error { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.dsh-toc-item .text {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  font-size: 12px;
}
.dsh-toc-preview-box {
  font-size: 11px;
  opacity: 0.8;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  background: rgba(128, 128, 128, 0.08);
  padding: 4px 6px;
  border-radius: 4px;
  margin-left: 24px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 44px;
  overflow: hidden;
}
.dsh-toc-empty {
  padding: 24px 8px;
  text-align: center;
  font-size: 12px;
  color: var(--toc-muted);
}
`

let styleInjected = false
function ensureStyle(): void {
  if (styleInjected) return
  styleInjected = true
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-chat-toc'
  tag.textContent = STYLE
  document.head.appendChild(tag)
}

const DOT_COLOR: Record<string, string> = { user: 'user', assistant: 'assistant' }

export function TocBar(props: { scrollEl: HTMLElement; items: TocItem[] }): React.ReactElement | null {
  const { scrollEl, items } = props
  const t = useT()

  // 如果没有实际消息，静默不渲染
  if (items.length === 0) return null

  ensureStyle()

  const [coords, setCoords] = useState<{ right: number; top: number }>({ right: 36, top: 120 })
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [starOnly, setStarOnly] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const [starred, setStarred] = useState<Set<string>>(() => {
    try {
      const raw = window.localStorage.getItem('dsh-toc-starred')
      return raw !== null ? new Set(JSON.parse(raw) as string[]) : new Set()
    } catch {
      return new Set()
    }
  })

  const toggleStar = useCallback((key: string): void => {
    setStarred((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      try {
        window.localStorage.setItem('dsh-toc-starred', JSON.stringify([...next]))
      } catch {}
      return next
    })
  }, [])

  const exportMarkdown = useCallback(() => {
    if (items.length === 0) return
    const lines = items.map((item, idx) => {
      const role = item.kind === 'user' ? '👤 User' : item.kind === 'assistant' ? '🤖 Assistant' : '💬 Message'
      const star = starred.has(item.key) ? ' ⭐' : ''
      return `${idx + 1}. **${role}**${star}: ${item.text || item.key}`
    })
    const doc = `# 对话大纲目录\n\n共 ${items.length} 条记录：\n\n${lines.join('\n')}\n`
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(doc).then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      })
    }
  }, [items, starred])

  // 全局快捷键 Cmd/Ctrl + Shift + O
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape' && open && !pinned) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, pinned])

  // 测量并对齐到官方原生的 Turn Rail 轨道
  useEffect(() => {
    const updatePosition = () => {
      const rail = document.querySelector<HTMLElement>('[class*="rail"], [class*="_frame"]')
      if (rail !== null) {
        const r = rail.getBoundingClientRect()
        setCoords({
          right: Math.max(16, window.innerWidth - r.left + 8),
          top: Math.max(40, r.top),
        })
      } else {
        const r = scrollEl.getBoundingClientRect()
        setCoords({
          right: Math.max(24, window.innerWidth - r.right + 24),
          top: Math.max(40, r.top + 60),
        })
      }
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    const timer = window.setInterval(updatePosition, 1000)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.clearInterval(timer)
    }
  }, [scrollEl])

  const filteredItems = useMemo(() => {
    let result = items
    if (starOnly) {
      result = result.filter((item) => starred.has(item.key))
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      result = result.filter((item) => item.text.toLowerCase().includes(q) || (item.preview ?? '').toLowerCase().includes(q))
    }
    return result
  }, [items, starOnly, query, starred])

  const jumpTo = useCallback((item: TocItem) => {
    if (!pinned) setOpen(false)
    item.el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [pinned])

  return (
    <div className="dsh-toc-overlay" style={{ right: coords.right, top: coords.top }}>
      {/* 挂载在原生轨道顶侧的胶囊大纲快捷按钮 */}
      <button
        type="button"
        className={`dsh-toc-trigger${open ? ' active' : ''}`}
        style={{ top: -34, right: 0 }}
        title={`${t('toc.title')} (Ctrl+Shift+O)`}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 3.5h11M2.5 8h11M2.5 12.5h7" />
        </svg>
      </button>

      {/* 展开的完整大纲面板 */}
      {open ? (
        <div ref={panelRef} className="dsh-toc-panel" style={{ right: 0, top: 0 }}>
          <div className="dsh-toc-head">
            <span className="dsh-toc-title">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3.5h12M2 8h12M2 12.5h8" />
              </svg>
              {t('toc.title')}
            </span>

            {/* 仅看收藏 */}
            <button
              type="button"
              className={`dsh-toc-btn${starOnly ? ' active' : ''}`}
              title={t('toc.starOnly')}
              onClick={() => setStarOnly((v) => !v)}
            >
              <svg viewBox="0 0 16 16" width="13" height="13" fill={starOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
                <path d="M8 2l1.7 3.6 4 .5-2.9 2.8.7 4L8 11.2 4.5 12.9l.7-4L2.3 6.1l4-.5z" />
              </svg>
            </button>

            {/* 复制大纲 */}
            <button
              type="button"
              className="dsh-toc-btn"
              title={copied ? t('toc.exported') : t('toc.export')}
              onClick={exportMarkdown}
            >
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="5" width="8" height="9" rx="1.5" />
                <path d="M3 11V3.5A1.5 1.5 0 014.5 2H10" />
              </svg>
            </button>

            {/* 钉住固定 */}
            <button
              type="button"
              className={`dsh-toc-btn${pinned ? ' active' : ''}`}
              title={pinned ? '取消固定' : '固定面板'}
              onClick={() => setPinned((v) => !v)}
            >
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2v4l-2 2v2h4.5v4l.5.5.5-.5V10H14V8l-2-2V2z" />
              </svg>
            </button>

            {/* 关闭按钮 */}
            <button
              type="button"
              className="dsh-toc-btn"
              title="关闭"
              onClick={() => {
                setOpen(false)
                setPinned(false)
              }}
            >
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
              </svg>
            </button>
          </div>

          <input
            type="text"
            className="dsh-toc-search"
            placeholder={t('toc.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="dsh-toc-list">
            {filteredItems.length === 0 ? (
              <div className="dsh-toc-empty">
                {starOnly ? t('toc.starEmpty') : query ? t('toc.searchEmpty') : t('toc.empty')}
              </div>
            ) : (
              filteredItems.map((item, idx) => (
                <div key={item.key} className="dsh-toc-item" onClick={() => jumpTo(item)}>
                  <div className="dsh-toc-item-row">
                    <span className={`bar ${DOT_COLOR[item.kind] ?? ''}`} />
                    <span className="num">{idx + 1}</span>
                    {item.tag ? <span className={`dsh-toc-badge ${item.tag}`}>{item.tag}</span> : null}
                    <span className="text" title={item.text}>{item.text}</span>
                    <button
                      type="button"
                      className="dsh-toc-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleStar(item.key)
                      }}
                      title={starred.has(item.key) ? t('toc.starRemove') : t('toc.starAdd')}
                    >
                      <svg viewBox="0 0 16 16" width="12" height="12" fill={starred.has(item.key) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
                        <path d="M8 2l1.7 3.6 4 .5-2.9 2.8.7 4L8 11.2 4.5 12.9l.7-4L2.3 6.1l4-.5z" />
                      </svg>
                    </button>
                  </div>
                  {item.preview ? <div className="dsh-toc-preview-box">{item.preview}</div> : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
