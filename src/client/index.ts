/**
 * DSH 官方 Turn Rail 原生深度增强插件:
 * - 紧邻 Session 日志按钮：直接挂载在右上角操作栏流内，与 Session 日志同排，彻底消灭双滚动条与任何错位！
 * - 智能提取用户提问 + AI 核心回答：呈现完整卡片双向预览，300ms 悬停防抖不闪退
 * - 永久持久化：基于会话 ID (Session ID) + 消息全局稳定指纹 (chatAnchorKey)
 * - 顶部极简扁平工具胶囊：🔍 搜索、⭐ 收藏过滤、📋 导出 Markdown 大纲
 * @module dsh-chat-toc/client/index
 */

import type {} from '@deepseek-ai/dsh-client-runtime'
import { initI18n, t } from './i18n.ts'

interface ClientContext {
  effect(fn: () => (() => void) | void, name: string): void
  locale?: {
    getLocale(): { active: string }
    subscribe(fn: () => void): () => void
  }
}

export const inject = ['locale', 'remote', 'remote.session', 'sessions']

const STYLE = `
/* 1. 隐藏官方原生 Turn Rail 悬停预览小卡片。
   识别方式：官方预览卡内部必定包含 previewPrompt 子节点（见 dsh-client-ui-chat 的
   TurnNavigator），因此用 :has() 精确锁定它本体 ——
     · 不受 CSS Module hash 变化影响（官方类名形如 eGxaPq_preview，不含 "rail" 字样）；
     · 绝不误伤右侧栏的「文档预览」面板（那也是 *_preview 类名）。
   注意：这里刻意保持「单条选择器」，不写含 :has() 的逗号列表 ——
   旧浏览器遇到无法解析的选择器会让整条规则失效。 */
[class*="_preview"]:has([class*="previewPrompt"]) {
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

    /* ================= 会话历史读取（不依赖 DOM 虚拟化） =================
     *
     * 背景：右侧轨道刻度的 aria-label 是 "Jump to turn N"，但官方聊天区是**虚拟化**
     * 渲染的——未滚动到的轮次根本不在 DOM 里。此前预览内容只能从 DOM 抓，于是未加载
     * 的刻度会「猜」到附近已加载的行，表现为连续多个预览内容相同、跳转后内容还会变。
     *
     * 正解：官方提供了完整会话日志的读取通道（`remote.session.follow` 的首帧即快照，
     * 含 records + cursor；更早的用 `remote.session.page` 按 beforeSeq 往回翻）。日志里
     * 的事件足以还原每一轮的提问与回复：
     *   · `turn/start  { turn: N }`          —— 轮次边界
     *   · `user/message { content:[{type:'text',text}] }` —— 用户提问
     *   · `assistant/message { turn:N, message.content:[{type:'text',text}] }` —— 助手回复
     * 这样预览内容与滚动、与 DOM 是否加载完全无关。
     */
    type TurnContent = { prompt: string; response: string }
    /** 一个会话的历史回填状态：记录按 seq 递增累积，map 为解析结果。 */
    type SessionHistory = {
      at: number
      records: unknown[]
      map: Map<number, TurnContent>
      cursor: number
      hasMore: boolean
      loading: boolean
    }
    const historyCache = new Map<string, SessionHistory>()
    /** 单次回填最多翻几页，避免一次悬停卡太久。 */
    const PAGES_PER_CALL = 6
    /** 每次分页取多少条记录。 */
    const PAGE_RECORDS = 300
    /** 安全上限：极端大会话不至于把内存吃光（约 4 万条记录）。 */
    const RECORD_CAP = 40000

    /** 取一段 content 数组里的纯文本（跳过 tool-call / tool-result 等）。 */
    const textOf = (content: unknown): string => {
      if (!Array.isArray(content)) return ''
      const parts: string[] = []
      for (const part of content) {
        const p = part as { type?: string; text?: unknown }
        if (p?.type === 'text' && typeof p.text === 'string' && p.text.trim() !== '') parts.push(p.text.trim())
      }
      return parts.join(' ').trim()
    }

    /**
     * 把会话日志记录解析成「轮次 → 提问/回复」。
     *
     * assistant/message 自带权威的 data.turn；user/message 不带 turn，归属于它后面的
     * 助手轮次（按出现顺序排队，遇到该轮的 assistant/message 时一次性取走）。
     */
    const parseTurns = (records: unknown[]): Map<number, TurnContent> => {
      const map = new Map<number, TurnContent>()
      const pending = new Map<number, string[]>()
      const pendingOrder: number[] = []
      let lastTurn = 0

      const takePending = (t: number): string => {
        const queue = pending.get(t)
        if (queue === undefined || queue.length === 0) return ''
        const joined = queue.join('\n')
        pending.set(t, [])
        return joined
      }

      for (const raw of records) {
        const ev = (raw as { event?: { type?: string; data?: Record<string, unknown> } })?.event
        if (ev?.type === undefined) continue
        const d = ev.data ?? {}
        if (ev.type === 'turn/start') {
          if (typeof d.turn === 'number') lastTurn = d.turn
          continue
        }
        if (ev.type === 'user/message') {
          const text = textOf(d.content)
          if (text === '') continue
          const t = typeof d.turn === 'number' ? d.turn : lastTurn
          if (t === 0) continue
          const queue = pending.get(t) ?? []
          queue.push(text)
          pending.set(t, queue)
          if (!pendingOrder.includes(t)) pendingOrder.push(t)
          continue
        }
        if (ev.type === 'assistant/message') {
          const t = typeof d.turn === 'number' ? d.turn : lastTurn
          if (t === 0) continue
          const text = textOf((d.message as { content?: unknown })?.content)
          if (text === '') continue
          const cur = map.get(t) ?? { prompt: '', response: '' }
          if (cur.prompt === '') cur.prompt = takePending(t)
          cur.response = cur.response === '' ? text : `${cur.response} ${text}`
          map.set(t, cur)
          lastTurn = t
        }
      }
      // 兜底：把没等到助手回复的 user 文本也落到轮次上，避免整轮缺失。
      for (const t of pendingOrder) {
        const queue = pending.get(t)
        if (queue !== undefined && queue.length > 0 && !map.has(t)) {
          map.set(t, { prompt: queue.join('\n'), response: '' })
        }
      }
      return map
    }

    /** 当前会话 id（来自 sessions.selection 快照）。 */
    const currentSessionId = (): string => {
      try {
        const sel = (ctx as { sessions?: { selection?: { getSnapshot?: () => unknown } } }).sessions?.selection
        const snap = typeof sel?.getSnapshot === 'function' ? (sel.getSnapshot() as { sessionId?: string }) : undefined
        return snap?.sessionId ?? ''
      } catch {
        return ''
      }
    }

    type RemoteSession = {
      follow?: (req: unknown) => AsyncIterable<unknown>
      page?: (req: unknown) => Promise<{ ok: boolean; value?: { records?: unknown[]; hasMore?: boolean } }>
    }

    /** 建立（或续接）某会话的历史回填：首帧快照 + 按需向前翻页。 */
    const backfill = async (sessionId: string, targetTurn: number): Promise<void> => {
      const remote = (ctx as { remote?: { session?: RemoteSession } }).remote?.session
      if (remote?.follow === undefined) return
      let st = historyCache.get(sessionId)
      if (st === undefined) {
        st = { at: 0, records: [], map: new Map(), cursor: 0, hasMore: false, loading: false }
        historyCache.set(sessionId, st)
      }
      if (st.loading) return
      st.loading = true
      try {
        // ① 首帧快照（只在第一次）
        if (st.cursor === 0) {
          const iter = remote.follow({ address: { kind: 'session', sessionId }, maxMessages: PAGE_RECORDS })
          for await (const frame of iter) {
            const f = frame as { type?: string; records?: unknown[]; cursor?: number; hasMore?: boolean }
            if (f?.type !== 'snapshot') continue
            st.records.push(...(f.records ?? []))
            st.cursor = f.cursor ?? 0
            st.hasMore = f.hasMore === true
            break
          }
          const closer = (iter as unknown as { return?: () => Promise<void> }).return
          if (typeof closer === 'function') { try { await closer.call(iter) } catch {} }
        }
        // ② 需要时向前翻页：直到覆盖到目标轮次、或没有更多、或达到上限
        let pages = 0
        while (st.hasMore && pages < PAGES_PER_CALL && st.records.length < RECORD_CAP && remote.page !== undefined) {
          const parsed = parseTurns(st.records)
          const oldestTurn = parsed.size > 0 ? Math.min(...parsed.keys()) : 0
          // 已经覆盖到目标轮次（或目标为 0 表示只取初始窗口）就停
          if (targetTurn > 0 && oldestTurn > 0 && oldestTurn <= targetTurn) break
          // 无法解析出轮次时，最多再翻 2 页避免死循环
          if (oldestTurn === 0 && pages >= 2) break
          const oldestSeq = (st.records[0] as { event?: { seq?: number } })?.event?.seq
          if (oldestSeq === undefined) break
          const res = await remote.page({
            address: { kind: 'session', sessionId },
            throughSeq: st.cursor,
            beforeSeq: oldestSeq,
            maxMessages: PAGE_RECORDS,
          })
          pages++
          if (res?.ok !== true) break
          const recs = res.value?.records ?? []
          if (recs.length === 0) break
          st.records.unshift(...recs)
          st.hasMore = res.value?.hasMore === true
        }
        st.records.sort((a, b) => ((a as { event?: { seq?: number } })?.event?.seq ?? 0) - ((b as { event?: { seq?: number } })?.event?.seq ?? 0))
        st.map = parseTurns(st.records)
        st.at = Date.now()
      } finally {
        st.loading = false
      }
    }

    /**
     * 同步取某会话的轮次内容；缺失目标轮次时后台回填，完成后再回调。
     * @returns 已有的 map（可能不含目标轮次）
     */
    const turnsFor = (sessionId: string, targetTurn: number, onReady?: (map: Map<number, TurnContent>) => void): Map<number, TurnContent> => {
      const st = historyCache.get(sessionId)
      const needMore = st === undefined || (targetTurn > 0 && !st.map.has(targetTurn))
      if (needMore) {
        void backfill(sessionId, targetTurn)
          .then(() => { const cur = historyCache.get(sessionId); if (cur !== undefined) onReady?.(cur.map) })
          .catch(() => {})
      }
      return st?.map ?? new Map()
    }
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

      /**
       * 把每个轨道刻度绑定到它对应的那一轮对话。
       *
       * 官方在同一份 DOM 上已经提供了权威的轮次信息，直接使用即可，不需要任何
       * 几何推算（实测刻度的 getBoundingClientRect 恒为 0，且滚动发生在内部
       * 容器而非 window，所以基于坐标的方案必然失败）：
       *   · 刻度按钮：aria-label="Jump to turn N" / "Load and jump to turn N"
       *   · 消息行：  data-chat-turn="N"（同时带 data-chat-flow-kind="user" 等）
       *
       * 因此绑定 = 刻度 turn N → 该 turn 的用户行。同一轮的多个中间刻度会落到
       * 同一轮（语义正确），不同轮必然不同，且与滚动位置完全无关。
       */
      const userRowsByTurn = new Map<string, HTMLElement>()
      for (const row of candidates) {
        const turn = row.dataset.chatTurn
        if (turn !== undefined && turn !== '' && !userRowsByTurn.has(turn)) userRowsByTurn.set(turn, row)
      }
      // 轮次号一律取「刻度在容器中的顺序号」（1 基），**绝不解析 aria-label**：
      // 那是本地化文案（英文 Jump to turn N / 中文 跳转到第 N 轮 / 西语 …），
      // 一旦按文案解析，用户切换界面语言就会失效。
      markItems.forEach((markEl, i) => {
        const row = userRowsByTurn.get(String(i + 1))
        if (row !== undefined) markEl.dataset.dshBoundKey = row.dataset.chatAnchorKey || ''
        else delete markEl.dataset.dshBoundKey
      })

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

    /**
     * 解析鼠标当前悬停位置所属的那一轮对话。
     *
     * 关键约束：官方轨道刻度（markPosition）的数量与「用户消息行」的数量**并不一一对应**
     * ——一次用户提问后可能产生多个刻度（工具调用、多段回复各占一个）。此前把轨道序号
     * 直接当作 candidates 下标使用，导致相邻多个刻度落到同一行，表现为「连续好几个预览
     * 内容都一样」。
     *
     * 因此这里改为**以真实 DOM 的 y 坐标为准**：把用户行按其在视口中的位置排序，取与
     * centerY 距离最近的那一行。activeIdx 只在完全没有坐标信息时作为兜底。
     */
    /**
     * 接收已通过 aria-label + data-chat-turn 精确找到的 userRow（onMouseMove 当场解析），
     * 从它向下寻找该轮的第一段像正文的回复内容。
     */
    const extractTurnContent = (userRow: HTMLElement | undefined): { key: string; promptText: string; responseText: string } => {
      if (userRow === undefined) return { key: '', promptText: '', responseText: '' }
      const allRows = Array.from(document.querySelectorAll<HTMLElement>('[data-chat-anchor-key]'))
      if (allRows.length === 0) return { key: '', promptText: '', responseText: '' }

      const key = userRow.dataset.chatAnchorKey || String(allRows.indexOf(userRow))
      const promptText = (userRow.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100)

      // 回复：从该用户行往下找第一段"像正文"的内容，遇到下一个用户行即停。
      let responseText = ''
      const startIndex = allRows.indexOf(userRow)
      if (startIndex >= 0) {
        for (let j = startIndex + 1; j < allRows.length; j++) {
          const nextRow = allRows[j]
          if (nextRow.dataset.chatFlowKind === 'user' || nextRow.querySelector('[class*="UserStyleBubble"]')) break
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

        // 关键：不要读 dataset.dshBoundKey，因为它是「上次 updateRailMarks 跑过」才
        // 写入的，如果跳转后的新轨道尚未被定时器维护，hover 会读到旧值/空值，
        // 内容因此错位或漂移。改成**当场解析**鼠标悬停的那个 mark 自带的
        // aria-label（"Jump to turn N"），再用官方行上的 data-chat-turn 查找。
        const activeEl = markPos ?? mark!.closest<HTMLElement>('[class*="markPosition"]') ?? mark!
        const allRows = Array.from(document.querySelectorAll<HTMLElement>('[data-chat-anchor-key]'))

        /* 轮次号的**唯一可靠**来源：该刻度在 marks 容器中的顺序（1 基）。
         *
         * 踩过的两个坑：
         *   · aria-label 是**本地化文案**（中文界面下是「跳转到第 381 轮」），
         *     用英文正则 /turn\s+(\d+)/ 解析会随界面语言时好时坏；
         *   · DOM 行的 data-chat-turn 只在「该轮已加载」时才存在，不能作为刻度→轮次的主依据。
         * 实测：刻度总数与会话日志的最大 turn 号一致（381 ↔ 381），故顺序号即绝对轮次号。 */
        const marksParent = activeEl.parentElement
        const allMarks = marksParent !== null
          ? Array.from(marksParent.querySelectorAll<HTMLElement>('[class*="markPosition"], [class*="_markPosition"]'))
          : []
        const markIndex = allMarks.indexOf(activeEl)
        const turnNum = markIndex >= 0 ? markIndex + 1 : 0
        const turn = turnNum > 0 ? String(turnNum) : ''

        // 优先用**会话日志**还原该轮内容：与 DOM 是否已加载、与滚动位置都无关。
        const sid = currentSessionId()
        const showFromData = (map: Map<number, TurnContent>): boolean => {
          const data = map.get(turnNum)
          if (data === undefined || (data.prompt === '' && data.response === '')) return false
          showCard(turnNum - 1, `turn:${turnNum}`, data.prompt || `第 ${turnNum} 轮对话`, data.response, centerY, rightDist)
          return true
        }
        // 目标轮次为 turnNum；缺这一轮时 turnsFor 会后台回填并在完成后回调。
        const cached = sid !== ''
          ? turnsFor(sid, turnNum, (map) => {
              // 数据到位后，若鼠标仍停在同一个刻度上，立刻换成正确内容。
              const hovered = [...document.querySelectorAll<HTMLElement>('[class*="markPosition"]')]
                .findIndex((el) => el.matches(':hover'))
              if (hovered >= 0 && hovered + 1 === turnNum) showFromData(map)
            })
          : undefined
        if (cached !== undefined && showFromData(cached)) return

        // 数据里确实没有这一轮（例如尚未写入日志）时，才退回 DOM 抓取；
        // 但**绝不**把附近已加载行当成这一轮的内容（那正是"内容重复"的根因）。
        const userRow = turn !== ''
          ? allRows.find((r) => r.dataset.chatTurn === turn && (r.dataset.chatFlowKind === 'user' || r.querySelector('[class*="UserStyleBubble"]')))
          : undefined
        if (userRow !== undefined) {
          const { key, promptText, responseText } = extractTurnContent(userRow)
          showCard(turnNum - 1 >= 0 ? turnNum - 1 : 0, key, promptText, responseText, centerY, rightDist)
          return
        }

        // 该轮在日志与 DOM 里都没有：提示尚未加载（不猜内容），
        // 同时后台补一页历史，稍后重新悬停即可看到。
        window.clearTimeout(hideTimer)
        const notLoadedKey = `not-loaded:${turn}`
        if (currentCard === null || currentCard.dataset.key !== notLoadedKey) {
          currentCard?.remove()
          const card = document.createElement('div')
          card.className = 'dsh-enhanced-preview-card'
          card.dataset.key = notLoadedKey
          card.style.top = `${centerY}px`
          card.style.right = `${rightDist}px`
          card.onmouseenter = () => window.clearTimeout(hideTimer)
          card.onmouseleave = () => scheduleHide()
          const promptEl = document.createElement('div')
          promptEl.className = 'dsh-enhanced-preview-prompt'
          promptEl.textContent = t('card.notLoaded')
          card.appendChild(promptEl)
          const hintEl = document.createElement('div')
          hintEl.className = 'dsh-enhanced-preview-response'
          hintEl.textContent = t('card.notLoadedHint')
          card.appendChild(hintEl)
          document.body.appendChild(card)
          currentCard = card
        } else {
          currentCard.style.top = `${centerY}px`
          currentCard.style.right = `${rightDist}px`
        }
        return
      } else {
        scheduleHide()
      }
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })

    // 4. 方案 A：在聊天窗口右上角顶栏（模型选择器与 ··· 之间）常驻精致操作胶囊
    const syncTopCapsule = () => {
      // 严禁注入到左侧边栏、弹窗、下拉菜单中
      const allButtons = Array.from(document.querySelectorAll<HTMLElement>('button'))
      
      // 过滤出真正位于主聊天区顶部（header/main）的操作按钮
      const topActionButtons = allButtons.filter((b) => {
        // 排除左侧边栏与导航
        if (b.closest('aside, nav, [class*="sidebar" i], [class*="drawer" i]')) return false
        // 排除弹窗、下拉菜单、Popover
        if (b.closest('[role="menu"], [class*="popover" i], [class*="menu" i], [class*="dropdown" i]')) return false
        
        // 按钮必须位于视口上方区域（例如 top < 80px）
        const rect = b.getBoundingClientRect()
        if (rect.top > 80 || rect.right < window.innerWidth / 2) return false
        return true
      })

      // 在右上角顶部按钮中，找到 ··· 按钮
      const moreBtn = topActionButtons.find((b) => {
        const text = b.textContent?.trim() || ''
        return text === '···' || b.getAttribute('aria-label')?.toLowerCase().includes('more') || b.className.toLowerCase().includes('more')
      })

      // 如果找不到 ···，找右上角其他操作按钮（如包含 svg/图标的顶栏按钮）
      const anchorBtn = moreBtn || topActionButtons[topActionButtons.length - 1]
      if (!anchorBtn || !anchorBtn.parentElement) return

      const container = anchorBtn.parentElement

      let capsule = document.querySelector<HTMLElement>('.dsh-top-capsule')
      if (capsule === null) {
        capsule = document.createElement('div')
        capsule.className = 'dsh-top-capsule'

        // 🔍 搜索按钮
        const searchBtn = document.createElement('button')
        searchBtn.className = 'dsh-top-btn'
        searchBtn.title = '搜索会话内容 (按 Enter 深度回溯历史)'
        searchBtn.innerHTML = `
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="7" cy="7" r="4.5"/>
            <path d="M10.5 10.5L14 14"/>
          </svg>
        `

        const searchInput = document.createElement('input')
        searchInput.className = 'dsh-top-search-input'
        searchInput.placeholder = '搜索本页...'

        let deepSearching = false
        const triggerLoadOlder = async (): Promise<boolean> => {
          const btns = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
          const loadOlderBtn = btns.find(
            (b) =>
              (b.textContent || '').includes('加载更早') ||
              (b.textContent || '').includes('Load earlier') ||
              (b.textContent || '').includes('Cargar anteriores'),
          )
          if (loadOlderBtn && !loadOlderBtn.disabled) {
            loadOlderBtn.click()
            await new Promise((resolve) => setTimeout(resolve, 600))
            return true
          }
          return false
        }

        searchInput.onkeydown = async (e) => {
          if (e.key === 'Escape') {
            searchExpanded = false
            searchInput.classList.remove('expanded')
            searchBtn.classList.remove('active')
            searchQuery = ''
            updateRailMarks()
          } else if (e.key === 'Enter' && searchQuery) {
            if (deepSearching) return
            deepSearching = true
            searchInput.placeholder = '🔍 正在深度回溯历史对话…'

            let found = false
            let attempts = 0
            while (attempts < 12) {
              const rows = document.querySelectorAll<HTMLElement>('[data-chat-anchor-key]')
              for (const r of rows) {
                if ((r.textContent || '').toLowerCase().includes(searchQuery)) {
                  r.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  updateRailMarks()
                  found = true
                  break
                }
              }
              if (found) break
              const hasMore = await triggerLoadOlder()
              if (!hasMore) break
              attempts++
            }

            searchInput.placeholder = found ? '已定位到匹配项' : '未在历史对话中找到'
            deepSearching = false
            setTimeout(() => {
              searchInput.placeholder = '搜索本页...'
            }, 3000)
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

        // ⭐ 收藏筛选
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

        // 💻 仅看代码块
        let codeOnly = false
        const codeBtn = document.createElement('button')
        codeBtn.className = 'dsh-top-btn'
        codeBtn.title = '仅高亮包含代码/工具调用的轮次'
        codeBtn.innerHTML = `
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="5 4 1 8 5 12"/>
            <polyline points="11 4 15 8 11 12"/>
            <line x1="9.5" y1="3" x2="6.5" y2="13"/>
          </svg>
        `
        codeBtn.onclick = (e) => {
          e.stopPropagation()
          codeOnly = !codeOnly
          codeBtn.classList.toggle('active', codeOnly)
          if (codeOnly) {
            codeBtn.style.color = 'var(--toc-accent, #3b82f6)'
            searchQuery = '```'
          } else {
            codeBtn.style.color = ''
            searchQuery = ''
          }
          updateRailMarks()
        }
        capsule.appendChild(codeBtn)

        // 📋 复制大纲 Markdown
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

        // 插入到锚点按钮（···）前面，完美并排显示！
        container.insertBefore(capsule, anchorBtn)
      }
    }

    /* 兜底：不依赖 :has() 的官方预览卡隐藏。
       同样以 previewPrompt 子节点识别，因此只可能命中官方卡片本体 ——
       既不会隐藏我们自己的卡片（它没有 previewPrompt），
       也不会碰到右侧栏的「文档预览」面板（它没有 previewPrompt）。 */
    const suppressOfficialPreview = () => {
      const prompts = document.querySelectorAll<HTMLElement>('[class*="previewPrompt"]')
      if (prompts.length === 0) return
      for (const node of prompts) {
        const card = node.closest<HTMLElement>('[class*="_preview"]')
        if (card !== null && card.style.display !== 'none') card.style.display = 'none'
      }
    }

    // 定时维护轨道标记与顶栏胶囊
    const timer = window.setInterval(() => {
      if (disposed) return
      syncTopCapsule()
      updateRailMarks()
      suppressOfficialPreview()
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
