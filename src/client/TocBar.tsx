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
.dsh-toc-item .text { flex:1; min-width:0; white-space:nowrap; overflow:hidden;
  text-overflow:ellipsis; line-height:1.6; }
.dsh-toc-empty { padding:10px 8px; font-size:12px; color:var(--toc-muted); }
.dsh-toc-search { width:100%; padding:5px 8px; margin-bottom:6px; font-size:12px;
  color:var(--toc-fg); background:var(--toc-bg); border:1px solid var(--toc-border);
  border-radius:6px; outline:none; }
.dsh-toc-search:focus { border-color:var(--toc-accent); }
.dsh-toc-search::placeholder { color:var(--toc-muted); }
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
  const closeTimer = useRef(0)

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

  // 搜索过滤：按摘要文本包含匹配（大小写不敏感）。
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q === '') return items
    return items.filter((item) => item.text.toLowerCase().includes(q) || item.key.toLowerCase().includes(q))
  }, [items, query])

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
          </div>
          <input className="dsh-toc-search" value={query} placeholder={t('toc.search')}
            onChange={(event) => setQuery(event.target.value)} />
          {filtered.length === 0 ? (
            <div className="dsh-toc-empty">{query.trim() === '' ? t('toc.empty') : t('toc.searchEmpty')}</div>
          ) : (
            filtered.map((item, index) => (
              <div key={item.key}
                className={`dsh-toc-item${item.key === currentKey ? ' current' : ''}`}
                title={t('toc.jump')} onClick={() => jumpTo(item)}>
                <span className={`bar ${DOT_COLOR[item.kind] ?? ''}`} />
                <span className="num">{index + 1}</span>
                <span className="text">{item.text || item.key}</span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
