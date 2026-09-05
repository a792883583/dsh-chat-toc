/**
 * DSH 官方 Turn Rail 原生无缝增强套件：
 * - 在右侧折叠按钮上方挂载精致的大纲面板按钮 (📑)
 * - 支持全局快捷键 Cmd/Ctrl + Shift + O 一键滑出/收起大纲抽屉
 * - 完整支持：实时关键词搜索、消息加星收藏 (⭐)、Markdown 大纲导出 (📋)、面板固定 (📌)
 * - 点击消息平滑滚动至对应气泡
 * @module dsh-chat-toc/client/TocBar
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useT } from './i18n.ts'

export interface TocItem {
  key: string
  kind: string
  text: string
  el: HTMLElement
  tag?: 'code' | 'tool' | 'error'
  preview?: string
}

const STYLE = `
.dsh-toc-wrap {
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
  z-index: 999;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  pointer-events: none;
}
[data-ds-dark-theme] .dsh-toc-wrap,
[data-theme="dark"] .dsh-toc-wrap,
html.dark .dsh-toc-wrap {
  --toc-fg: #f3f4f6;
  --toc-muted: #9ca3af;
  --toc-bg: #1f2937;
  --toc-border: rgba(255, 255, 255, 0.14);
  --toc-hover: rgba(255, 255, 255, 0.08);
  --toc-accent: #3b82f6;
  --toc-user: #3b82f6;
  --toc-assistant: #22c55e;
  --toc-other: #9ca3af;
}
.dsh-toc-wrap * { box-sizing: border-box; }

/* 浮动常驻触发按钮：优雅停靠在右侧折叠小按钮上方 */
.dsh-toc-launcher {
  position: fixed;
  pointer-events: auto;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--toc-bg);
  border: 1px solid var(--toc-border);
  color: var(--toc-muted);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  z-index: 1000;
}
.dsh-toc-launcher:hover, .dsh-toc-launcher.open {
  color: var(--toc-accent);
  border-color: var(--toc-accent);
  background: var(--toc-bg);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

/* 弹出的大纲侧边抽屉面板 */
.dsh-toc-drawer {
  position: fixed;
  pointer-events: auto;
  width: 330px;
  max-height: 80vh;
  background: var(--toc-bg);
  border: 1px solid var(--toc-border);
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.22);
  padding: 12px;
  display: flex;
  flex-direction: column;
  animation: dshTocSlide 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 1001;
}
@keyframes dshTocSlide {
  from { opacity: 0; transform: translateX(8px) scale(0.98); }
  to { opacity: 1; transform: translateX(0) scale(1); }
}

.dsh-toc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 2px 10px;
  border-bottom: 1px solid var(--toc-border);
  margin-bottom: 8px;
}
.dsh-toc-heading {
  font-size: 13px;
  font-weight: 600;
  color: var(--toc-fg);
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}
.dsh-toc-action {
  border: none;
  background: transparent;
  color: var(--toc-muted);
  cursor: pointer;
  padding: 5px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  transition: all 0.12s ease;
}
.dsh-toc-action:hover { background: var(--toc-hover); color: var(--toc-fg); }
.dsh-toc-action.active { color: var(--toc-accent); background: var(--toc-hover); }

.dsh-toc-input {
  width: 100%;
  padding: 6px 10px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--toc-fg);
  background: var(--toc-bg);
  border: 1px solid var(--toc-border);
  border-radius: 6px;
  outline: none;
  transition: border-color 0.12s;
}
.dsh-toc-input:focus { border-color: var(--toc-accent); }
.dsh-toc-input::placeholder { color: var(--toc-muted); }

.dsh-toc-scroll {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: calc(80vh - 110px);
}
.dsh-toc-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 7px 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  color: var(--toc-fg);
  transition: background 0.1s;
}
.dsh-toc-row:hover { background: var(--toc-hover); }
.dsh-toc-row-main { display: flex; align-items: center; gap: 6px; }
.dsh-toc-bar-line {
  flex: none;
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: var(--toc-other);
  opacity: 0.7;
}
.dsh-toc-bar-line.user { background: var(--toc-user); }
.dsh-toc-bar-line.assistant { background: var(--toc-assistant); }
.dsh-toc-idx {
  flex: none;
  min-width: 18px;
  text-align: right;
  color: var(--toc-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.dsh-toc-tag {
  flex: none;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 4px;
  line-height: 1.2;
  text-transform: uppercase;
}
.dsh-toc-tag.code { background: rgba(59, 130, 246, 0.15); color: var(--toc-accent); }
.dsh-toc-tag.tool { background: rgba(234, 179, 8, 0.15); color: #ca8a04; }
.dsh-toc-tag.error { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.dsh-toc-desc {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  font-size: 12px;
}
.dsh-toc-subpreview {
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
.dsh-toc-nodata {
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

  if (items.length === 0) return null

  ensureStyle()

  // 坐标：停靠在折叠按钮上方
  const [pos, setPos] = useState<{ right: number; top: number }>({ right: 6, top: 300 })
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [starOnly, setStarOnly] = useState(false)

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

  // 快捷键 Cmd/Ctrl + Shift + O
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

  // 定位计算：检测官方折叠箭头按钮或轨道，紧邻其左上方停靠
  useEffect(() => {
    const measure = () => {
      const toggle = document.querySelector<HTMLElement>('button[aria-label*="collapse" i], button[aria-label*="折叠" i], [class*="collapseBtn"]')
      if (toggle !== null) {
        const r = toggle.getBoundingClientRect()
        setPos({
          right: Math.max(8, window.innerWidth - r.right),
          top: Math.max(40, r.top - 36),
        })
      } else {
        const rail = document.querySelector<HTMLElement>('[class*="rail"], [class*="_frame"]')
        if (rail !== null) {
          const r = rail.getBoundingClientRect()
          setPos({
            right: Math.max(8, window.innerWidth - r.right),
            top: Math.max(40, r.top - 36),
          })
        } else {
          setPos({ right: 12, top: 260 })
        }
      }
    }
    measure()
    window.addEventListener('resize', measure)
    const interval = window.setInterval(measure, 1000)
    return () => {
      window.removeEventListener('resize', measure)
      window.clearInterval(interval)
    }
  }, [scrollEl])

  const filtered = useMemo(() => {
    let list = items
    if (starOnly) {
      list = list.filter((it) => starred.has(it.key))
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((it) => it.text.toLowerCase().includes(q) || (it.preview ?? '').toLowerCase().includes(q))
    }
    return list
  }, [items, starOnly, query, starred])

  const jumpTo = useCallback((item: TocItem) => {
    if (!pinned) setOpen(false)
    item.el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [pinned])

  return (
    <div className="dsh-toc-wrap">
      {/* 极简常驻大纲按钮：停靠在折叠按钮正上方 */}
      <button
        type="button"
        className={`dsh-toc-launcher${open ? ' open' : ''}`}
        style={{ right: pos.right, top: pos.top }}
        title={`${t('toc.title')} (Ctrl+Shift+O)`}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 3.5h11M2.5 8h11M2.5 12.5h7" />
        </svg>
      </button>

      {/* 点击弹出的完整大纲抽屉 */}
      {open ? (
        <div className="dsh-toc-drawer" style={{ right: pos.right + 34, top: Math.max(30, pos.top - 120) }}>
          <div className="dsh-toc-header">
            <span className="dsh-toc-heading">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3.5h12M2 8h12M2 12.5h8" />
              </svg>
              {t('toc.title')}
              <span style={{ fontSize: 11, fontWeight: 'normal', opacity: 0.6 }}>({items.length})</span>
            </span>

            {/* 仅看收藏 */}
            <button
              type="button"
              className={`dsh-toc-action${starOnly ? ' active' : ''}`}
              title={t('toc.starOnly')}
              onClick={() => setStarOnly((v) => !v)}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill={starOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
                <path d="M8 2l1.7 3.6 4 .5-2.9 2.8.7 4L8 11.2 4.5 12.9l.7-4L2.3 6.1l4-.5z" />
              </svg>
            </button>

            {/* 复制大纲 */}
            <button
              type="button"
              className="dsh-toc-action"
              title={copied ? t('toc.exported') : t('toc.export')}
              onClick={exportMarkdown}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="5" width="8" height="9" rx="1.5" />
                <path d="M3 11V3.5A1.5 1.5 0 014.5 2H10" />
              </svg>
            </button>

            {/* 固定面板 */}
            <button
              type="button"
              className={`dsh-toc-action${pinned ? ' active' : ''}`}
              title={pinned ? '取消固定' : '固定面板'}
              onClick={() => setPinned((v) => !v)}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2v4l-2 2v2h4.5v4l.5.5.5-.5V10H14V8l-2-2V2z" />
              </svg>
            </button>

            {/* 关闭 */}
            <button
              type="button"
              className="dsh-toc-action"
              title="关闭"
              onClick={() => {
                setOpen(false)
                setPinned(false)
              }}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
              </svg>
            </button>
          </div>

          <input
            type="text"
            className="dsh-toc-input"
            placeholder={t('toc.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="dsh-toc-scroll">
            {filtered.length === 0 ? (
              <div className="dsh-toc-nodata">
                {starOnly ? t('toc.starEmpty') : query ? t('toc.searchEmpty') : t('toc.empty')}
              </div>
            ) : (
              filtered.map((item, idx) => (
                <div key={item.key} className="dsh-toc-row" onClick={() => jumpTo(item)}>
                  <div className="dsh-toc-row-main">
                    <span className={`dsh-toc-bar-line ${DOT_COLOR[item.kind] ?? ''}`} />
                    <span className="dsh-toc-idx">{idx + 1}</span>
                    {item.tag ? <span className={`dsh-toc-tag ${item.tag}`}>{item.tag}</span> : null}
                    <span className="dsh-toc-desc" title={item.text}>{item.text}</span>
                    <button
                      type="button"
                      className="dsh-toc-action"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleStar(item.key)
                      }}
                      title={starred.has(item.key) ? t('toc.starRemove') : t('toc.starAdd')}
                    >
                      <svg viewBox="0 0 16 16" width="13" height="13" fill={starred.has(item.key) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
                        <path d="M8 2l1.7 3.6 4 .5-2.9 2.8.7 4L8 11.2 4.5 12.9l.7-4L2.3 6.1l4-.5z" />
                      </svg>
                    </button>
                  </div>
                  {item.preview ? <div className="dsh-toc-subpreview">{item.preview}</div> : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
