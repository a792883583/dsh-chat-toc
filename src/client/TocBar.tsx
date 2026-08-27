/**
 * 对话目录条：贴合聊天区右缘的窄条，条内按消息顺序分布位置标记（圆点）；
 * 鼠标悬停展开目录列表（角色色点 + 摘要），点击条目平滑滚动到对应消息。
 * @module dsh-chat-toc/client/TocBar
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useT } from './i18n.ts'

/** 一条对话消息的目录项。 */
export interface TocItem {
  /** 消息 key（data-chat-anchor-key），稳定标识。 */
  key: string
  /** 消息类型（data-chat-flow-kind，可能为空）。 */
  kind: string
  /** 摘要文本。 */
  text: string
  /** 消息 DOM 元素（点击时滚动目标）。 */
  el: HTMLElement
  /** 消息特征标签（code / tool / error）。 */
  tag?: 'code' | 'tool' | 'error'
}

const STYLE = `
.dsh-toc { --toc-fg:#24292f; --toc-muted:#6e7781; --toc-bg:#ffffff; --toc-border:rgba(128,128,128,0.25);
  --toc-hover:rgba(0,0,0,0.06); --toc-accent:#1976d2; --toc-user:#1976d2; --toc-assistant:#1a7f37;
  --toc-other:#8b949e; position:fixed; z-index:900; font-family:-apple-system,BlinkMacSystemFont,
  "Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif; }
[data-ds-dark-theme] .dsh-toc { --toc-fg:#d1d9e0; --toc-muted:#9198a1; --toc-bg:#1f2328;
  --toc-border:rgba(255,255,255,0.14); --toc-hover:rgba(255,255,255,0.08); --toc-accent:#58a6ff;
  --toc-user:#58a6ff; --toc-assistant:#3fb950; --toc-other:#8b949e; }
.dsh-toc * { box-sizing:border-box; }

/* 窄条：书本目录风格的位置标记（横线长度 ≈ 消息内容量） */
.dsh-toc-bar { position:absolute; top:0; bottom:0; width:14px; border-radius:7px;
  display:flex; justify-content:center; cursor:default;
  transition:background 0.12s ease; }
.dsh-toc-bar:hover { background:var(--toc-hover); }
.dsh-toc-dots { position:absolute; top:8px; bottom:8px; left:0; right:0;
  display:flex; flex-direction:column; align-items:center; gap:4px; overflow:hidden; }
.dsh-toc-dot { flex:none; height:4px; border-radius:2px;
  background:var(--toc-other); opacity:0.5; transition:opacity 0.12s ease, transform 0.12s ease; }
.dsh-toc-bar:hover .dsh-toc-dot { opacity:0.85; }
.dsh-toc-dot.user { background:var(--toc-user); }
.dsh-toc-dot.assistant { background:var(--toc-assistant); }
.dsh-toc-dot.current { opacity:1; transform:scale(1.15); box-shadow:0 0 0 1px var(--toc-bg); }
.dsh-toc-dot:first-child { margin-top:auto; }
.dsh-toc-dot:last-child { margin-bottom:auto; }

/* 悬停展开的目录列表 */
.dsh-toc-pop { position:absolute; right:calc(100% + 10px); top:-10px; width:280px;
  max-height:70vh; overflow-y:auto; background:var(--toc-bg); border:1px solid var(--toc-border);
  border-radius:10px; box-shadow:0 12px 32px rgba(0,0,0,0.2); padding:6px; }
.dsh-toc-pop .head { display:flex; align-items:center; gap:6px; padding:4px 8px 8px;
  font-size:11px; color:var(--toc-muted); font-weight:600; letter-spacing:0.4px;
  border-bottom:1px solid var(--toc-border); margin-bottom:6px; }
.dsh-toc-pop .head svg { opacity:0.7; }
.dsh-toc-item { display:flex; align-items:flex-start; gap:8px; padding:6px 8px;
  border-radius:6px; cursor:pointer; font-size:12px; color:var(--toc-fg); }
.dsh-toc-item:hover { background:var(--toc-hover); }
.dsh-toc-item.current { background:var(--toc-hover); }
.dsh-toc-item .bar { flex:none; width:3px; align-self:stretch; border-radius:2px;
  background:var(--toc-other); opacity:0.7; }
.dsh-toc-item .bar.user { background:var(--toc-user); }
.dsh-toc-item .bar.assistant { background:var(--toc-assistant); }
.dsh-toc-item .num { flex:none; min-width:20px; text-align:right; color:var(--toc-muted);
  font-size:11px; line-height:1.6; font-variant-numeric:tabular-nums; }
.dsh-toc-badge { flex:none; font-size:9.5px; font-weight:600; padding:1px 4px; border-radius:4px;
  line-height:1.4; text-transform:uppercase; }
.dsh-toc-badge.code { background:rgba(88,166,255,0.15); color:var(--toc-accent); }
.dsh-toc-badge.tool { background:rgba(210,153,34,0.15); color:#d29922; }
.dsh-toc-badge.error { background:rgba(248,81,73,0.15); color:#f85149; }
.dsh-toc-item .text { flex:1; min-width:0; white-space:nowrap; overflow:hidden;
  text-overflow:ellipsis; line-height:1.6; }
.dsh-toc-empty { padding:10px 8px; font-size:12px; color:var(--toc-muted); }
.dsh-toc-search { width:100%; padding:5px 8px; margin-bottom:6px; font-size:12px;
  color:var(--toc-fg); background:var(--toc-bg); border:1px solid var(--toc-border);
  border-radius:6px; outline:none; }
.dsh-toc-search:focus { border-color:var(--toc-accent); }
.dsh-toc-search::placeholder { color:var(--toc-muted); }
.dsh-toc-star-toggle { display:inline-flex; align-items:center; gap:2px; padding:2px 5px; border:none;
  background:transparent; color:var(--toc-muted); cursor:pointer; font-size:11px; border-radius:5px; }
.dsh-toc-star-toggle:hover { background:var(--toc-hover); }
.dsh-toc-star-toggle.active { color:var(--toc-accent); }
.dsh-toc-star { flex:none; padding:1px; border:none; background:transparent; color:var(--toc-muted);
  cursor:pointer; border-radius:4px; line-height:0; }
.dsh-toc-star:hover { background:var(--toc-hover); }
.dsh-toc-star.on { color:var(--toc-accent); }
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

/**
 * 目录条组件。
 * @param props.scrollEl 对话滚动容器（[data-conversation-scroll]），用于定位与滚动。
 * @param props.items    消息目录项（按对话顺序）。
 */
export function TocBar(props: { scrollEl: HTMLElement; items: TocItem[] }): React.ReactElement {
  const { scrollEl, items } = props
  const t = useT()
  const [rect, setRect] = useState({ right: 0, top: 0, height: 0 })
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  // 收藏：消息 key 集合（localStorage 持久化）。
  const [starred, setStarred] = useState<Set<string>>(() => {
    try {
      const raw = window.localStorage.getItem('dsh-toc-starred')
      return raw !== null ? new Set(JSON.parse(raw) as string[]) : new Set()
    } catch {
      return new Set()
    }
  })
  // 过滤模式：全部 / 仅收藏。
  const [starOnly, setStarOnly] = useState(false)
  const [copied, setCopied] = useState(false)
  const closeTimer = useRef(0)

  /** 导出/复制当前大纲为 Markdown。 */
  const exportMarkdown = useCallback((): void => {
    if (items.length === 0) return
    const lines = items.map((item, idx) => {
      const role = item.kind === 'user' ? '👤 User' : item.kind === 'assistant' ? '🤖 Assistant' : '💬 Message'
      const star = starred.has(item.key) ? ' ⭐' : ''
      return `${idx + 1}. **${role}**${star}: ${item.text || item.key}`
    })
    const doc = `# 对话目录大纲\n\n共 ${items.length} 条记录：\n\n${lines.join('\n')}\n`
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(doc).then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      })
    }
  }, [items, starred])

  /** 切换某条消息的收藏状态。 */
  const toggleStar = useCallback((key: string): void => {
    setStarred((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      try {
        window.localStorage.setItem('dsh-toc-starred', JSON.stringify([...next]))
      } catch {
        /* 忽略 */
      }
      return next
    })
  }, [])

  // 跟踪定位：目录条停靠在 git 面板折叠箭头的左侧（聊天区内侧）；
  // 无箭头时回退到滚动容器右缘外侧。
  useEffect(() => {
    const measure = (): void => {
      const r = scrollEl.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) return
      const toggle = document.querySelector<HTMLElement>('[data-git-panel-toggle]')
      const right = toggle !== null
        ? window.innerWidth - toggle.getBoundingClientRect().left + 8
        : window.innerWidth - r.right + 6
      setRect({ right, top: r.top, height: r.height })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(scrollEl)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [scrollEl])

  const openSoon = useCallback((): void => {
    window.clearTimeout(closeTimer.current)
    setOpen(true)
  }, [])
  const closeSoon = useCallback((): void => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(false), 220)
  }, [])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const jumpTo = useCallback((item: TocItem): void => {
    setOpen(false)
    item.el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // 当前阅读位置：视口顶部之下第一条消息即当前项（滚动时同步高亮）。
  const [currentKey, setCurrentKey] = useState<string | null>(null)
  useEffect(() => {
    if (items.length === 0) return
    let raf = 0
    const update = (): void => {
      const top = scrollEl.getBoundingClientRect().top + 10
      let key: string | null = null
      for (const item of items) {
        if (item.el.getBoundingClientRect().bottom > top) {
          key = item.key
          break
        }
      }
      setCurrentKey((prev) => (prev === key ? prev : key))
    }
    const onScroll = (): void => {
      if (raf !== 0) return
      raf = requestAnimationFrame(() => {
        raf = 0
        update()
      })
    }
    update()
    scrollEl.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scrollEl.removeEventListener('scroll', onScroll)
      if (raf !== 0) cancelAnimationFrame(raf)
    }
  }, [scrollEl, items])

  // 位置标记：横线长度 ≈ 消息内容量（书本目录感）；消息多时自然变密集。
  const dots = useMemo(() => {
    const max = Math.floor((rect.height - 20) / 8)
    const shown = items.slice(0, Math.max(max, 1))
    return shown.map((item) => ({
      item,
      width: Math.min(14, Math.max(4, Math.round(item.text.length / 2.2) + 3)),
    }))
  }, [items, rect.height])

  // 搜索 + 收藏过滤：先按收藏，再按摘要文本包含匹配（大小写不敏感）。
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = starOnly ? items.filter((item) => starred.has(item.key)) : items
    if (q === '') return base
    return base.filter((item) => item.text.toLowerCase().includes(q) || item.key.toLowerCase().includes(q))
  }, [items, query, starred, starOnly])

  ensureStyle()
  if (rect.height === 0) return <div className="dsh-toc" style={{ display: 'none' }} />

  return (
    <div
      className="dsh-toc"
      style={{ right: rect.right, top: rect.top + 8, height: Math.max(40, rect.height - 16) }}
      onMouseEnter={openSoon}
      onMouseLeave={closeSoon}
    >
      <div className="dsh-toc-bar" title={t('toc.title')}>
        <div className="dsh-toc-dots">
          {dots.map(({ item, width }) => (
            <div
              key={item.key}
              className={`dsh-toc-dot ${DOT_COLOR[item.kind] ?? ''}${item.key === currentKey ? ' current' : ''}`}
              style={{ width }}
            />
          ))}
        </div>
      </div>
      {open ? (
        <div className="dsh-toc-pop" onMouseEnter={openSoon} onMouseLeave={closeSoon}>
          <div className="head">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor"
              strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 3.5h12M2 8h9M2 12.5h6" />
            </svg>
            {t('toc.title')}
            <span className="spacer" style={{ flex: 1 }} />
            <button type="button" className="dsh-toc-star-toggle"
              title={t('toc.export')} onClick={exportMarkdown}>
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 2h6a1 1 0 0 1 1 1v1H4V3a1 1 0 0 1 1-1zM4 4h8v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4z" />
              </svg>
              <span>{copied ? t('toc.exported') : ''}</span>
            </button>
            <button type="button" className={`dsh-toc-star-toggle${starOnly ? ' active' : ''}`}
              title={t('toc.starOnly')} onClick={() => setStarOnly((v) => !v)}>
              <svg viewBox="0 0 16 16" width="12" height="12" fill={starOnly ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 2l1.7 3.6 4 .5-2.9 2.8.7 4L8 11.2 4.5 12.9l.7-4L2.3 6.1l4-.5z" />
              </svg>
              <span>{starred.size > 0 ? String(starred.size) : ''}</span>
            </button>
          </div>
          <input className="dsh-toc-search" value={query} placeholder={t('toc.search')}
            onChange={(event) => setQuery(event.target.value)} />
          {filtered.length === 0 ? (
            <div className="dsh-toc-empty">
              {starOnly ? t('toc.starEmpty') : (query.trim() === '' ? t('toc.empty') : t('toc.searchEmpty'))}
            </div>
          ) : (
            filtered.map((item, index) => (
              <div key={item.key}
                className={`dsh-toc-item${item.key === currentKey ? ' current' : ''}`}
                title={t('toc.jump')} onClick={() => jumpTo(item)}>
                <span className={`bar ${DOT_COLOR[item.kind] ?? ''}`} />
                <span className="num">{index + 1}</span>
                {item.tag ? <span className={`dsh-toc-badge ${item.tag}`}>{item.tag}</span> : null}
                <span className="text">{item.text || item.key}</span>
                <button type="button"
                  className={`dsh-toc-star${starred.has(item.key) ? ' on' : ''}`}
                  title={starred.has(item.key) ? t('toc.starRemove') : t('toc.starAdd')}
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleStar(item.key)
                  }}>
                  <svg viewBox="0 0 16 16" width="12" height="12"
                    fill={starred.has(item.key) ? 'currentColor' : 'none'}
                    stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" aria-hidden="true">
                    <path d="M8 2l1.7 3.6 4 .5-2.9 2.8.7 4L8 11.2 4.5 12.9l.7-4L2.3 6.1l4-.5z" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
