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

/**
 * 官方 Turn Rail 的刻度选择器（需同时兼容新旧两代官方实现）。
 *
 * ⚠️ 官方在 `dsh-client-ui-chat@0.2.0-rc.1` 做了**破坏性改版**：
 *   · **删除了 `markPosition` 类名** —— 旧版的 `div.markPosition > button.mark`
 *     结构不复存在，新版是 `div.marks > button.mark`（刻度按钮自身绝对定位）；
 *   · 刻度改为**虚拟化渲染**（`virtualizer`，只渲染可见项，滚动时复用）。
 * 因此任何依赖 `markPosition` 的选择器在新版下**恒为空**（曾导致悬停完全无反应）。
 *
 * 现在的判定锚点是**刻度按钮自身**：`button[aria-label]`，它在两代里都存在，
 * 且新版额外带 `data-index`（虚拟列表下标）。
 *
 * ⚠️ 另一个历史踩坑：更早用过裸子串 `[class*="mark"]` / `[class*="frame"]`，
 * 命中面极大 —— 生态内 `.markCatalogParentExpandable` / `.markDirty`（目录树）、
 * `.marker` / `.yAWgPa_marker`（消息标记）等小写类名都会被误命中，
 * 导致鼠标划过正文就疯狂弹卡片。故一律要求**下划线前缀** `_mark` / `_frame`。
 */
const SEL_MARK_BUTTON = 'button[class*="_mark"][aria-label]'
/** 官方轨道外框。 */
const SEL_FRAME = '[class*="_frame"]'
/** 官方用于标记「该轮尚未加载」的类名（加在刻度按钮自身）。 */
const SEL_MARK_UNLOADED = '[class*="_markUnloaded"]'

/**
 * 从官方刻度的 `aria-label` 解析轮次号。
 *
 * 官方源码（TurnNavigator）：`aria-label = t("chat.turnNavigation.jump" | "…jumpLoad", { turn })`，
 * 文案本身会本地化，但 **`{turn}` 永远是阿拉伯数字**，因此用「取末尾数字」的方式解析
 * 与界面语言无关（中文「跳转到第 381 轮」/ 英文 "Jump to turn 381" 都能取到 381）。
 *
 * ⚠️ 历史踩坑：此前误判「aria-label 是本地化文案不可靠」，改用「刻度在容器中的序号」
 * 当轮次号 —— 但官方 items 的 turn 号**并不保证从 1 连续**（历史分页、会话压缩后会出现
 * 空洞），序号一旦错位就会把**最新的一轮**判成「尚未加载」，表现为明明刚发的消息
 * 却提示未加载。故此处以官方 aria-label 为唯一权威来源。
 */
function turnFromAriaLabel(el: HTMLElement | null): number {
  if (el === null) return 0
  const label = el.getAttribute('aria-label') ?? ''
  const m = label.match(/(\d+)(?!.*\d)/)
  return m === null ? 0 : Number(m[1])
}

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

/* 2. 悬停预览卡片。
   样式**对齐官方原生轨道预览卡**（TurnNavigator 的 *_preview），保证与官方观感一致：
     · 背景 --dsw-alias-bg-layer-1（浅色纯白 #fff / 深色随主题）
     · 阴影 --dsw-elevation-panel、圆角 --dsw-radius-lg
     · 正文 --dsw-alias-label-primary、副文 --dsw-alias-label-caption
   注意：此前用过 --dsw-alias-bg-overlay（浅色是 #e9ecf2，明显偏灰），
   并额外写了写死的深色覆盖 #1f2937 —— 两者都与官方不一致，已移除。
   所有颜色一律走官方 token，不再硬编码，由主题自动适配。 */
.dsh-enhanced-preview-card {
  position: fixed;
  z-index: 1000;
  box-sizing: border-box;
  width: 300px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  border: 0;
  border-radius: var(--dsw-radius-lg, 10px);
  box-shadow: var(--dsw-elevation-panel, 0 8px 24px rgba(0, 0, 0, 0.12));
  padding: 10px 12px;
  color: var(--dsw-alias-label-primary, #24292f);
  pointer-events: auto;
  transition: opacity 0.15s ease, transform 0.15s ease;
  transform: translateY(-50%);
  animation: dshPreviewIn 0.12s ease-out;
}
@keyframes dshPreviewIn {
  from { opacity: 0; transform: translateY(-50%) translateX(4px); }
  to { opacity: 1; transform: translateY(-50%) translateX(0); }
}

/* 深色适配交由官方 token 完成（bg-layer-1 / label-primary 会随 body[data-ds-dark-theme]
   自动切换），因此不再需要写死的深色覆盖规则。 */

.dsh-enhanced-preview-prompt {
  font-weight: 600;
  font-size: 13px;
  color: var(--dsw-alias-label-primary, currentColor);
  margin-bottom: 4px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}
.dsh-enhanced-preview-response {
  font-size: 12px;
  color: var(--dsw-alias-label-caption, var(--dsw-alias-label-secondary, #6e7781));
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

/* 3. 紧邻 Session 日志按钮排列的轻量工具条：100% 消除双滚动条与错位。
   背景走官方浮层 token（bg-layer-2：浅色纯白 / 深色自动切换），
   不再用偏灰的 bg-overlay，也不再写死深色覆盖 —— 由主题自动适配。 */
.dsh-top-capsule {
  display: inline-flex;
  align-items: center;
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  border: 1px solid var(--dsw-alias-border-l4, rgba(128, 128, 128, 0.22));
  border-radius: var(--dsw-radius-lg, 8px);
  box-shadow: none !important;
  padding: 2px 4px;
  margin-right: 8px;
  vertical-align: middle;
  pointer-events: auto;
  white-space: nowrap;
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

/* 搜索匹配节点：加长发光。
   注：高亮类直接加在刻度按钮自身（新旧两代通用）；旧版曾需要
   以 _markPosition 作祖先的后代写法，新版已无该包裹层。 */
.dsh-mark-matched:before,
.dsh-mark-matched [class*="_mark"]:before {
  background: #2563eb !important;
  box-shadow: 0 0 8px #2563eb !important;
  width: 22px !important;
  opacity: 1 !important;
}

/* 已收藏的 mark 黄金高亮 */
.dsh-mark-starred:before,
.dsh-mark-starred [class*="_mark"]:before,
.dsh-filter-starred .dsh-mark-starred:before,
.dsh-filter-starred .dsh-mark-starred [class*="_mark"]:before {
  background: #eab308 !important;
  box-shadow: 0 0 10px rgba(234, 179, 8, 0.95) !important;
  width: 22px !important;
  opacity: 1 !important;
}

/* 过滤模式下，未收藏线条淡化 */
.dsh-filter-starred [class*="_mark"]:not(.dsh-mark-starred):before {
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

    /** 一次快照刷新之后，至少间隔这么久才允许再刷（防止悬停时反复拉取）。 */
    const SNAPSHOT_REFRESH_MS = 3000

    /**
     * 刷新会话快照（用于补齐「日志里回答还没写入」的轮次）。
     *
     * 背景：`backfill` 首帧快照只在第一次拉取，而**回答是在该轮结束后才写进日志的**。
     * 若首次回填发生在回答落库之前，`map` 里这一轮就永久只有提问（除非刷新页面）——
     * 表现为「有些卡片有 AI 回复、有些没有」。这里按目标轮次缺失情况做一次限频重拉，
     * 拉完重建 map 并回调。
     */
    const refreshSnapshot = async (sessionId: string): Promise<void> => {
      const remote = (ctx as { remote?: { session?: RemoteSession } }).remote?.session
      if (remote?.follow === undefined) return
      const st = historyCache.get(sessionId)
      if (st === undefined || st.loading) return
      if (Date.now() - st.at < SNAPSHOT_REFRESH_MS) return
      st.loading = true
      try {
        const iter = remote.follow({ address: { kind: 'session', sessionId }, maxMessages: PAGE_RECORDS })
        for await (const frame of iter) {
          const f = frame as { type?: string; records?: unknown[]; cursor?: number; hasMore?: boolean }
          if (f?.type !== 'snapshot') continue
          // 快照是「最近一段」记录；与已有记录按 seq 去重合并，保留更早翻页拿到的历史。
          const seen = new Set(st.records.map((r) => (r as { event?: { seq?: number } })?.event?.seq))
          for (const rec of f.records ?? []) {
            const seq = (rec as { event?: { seq?: number } })?.event?.seq
            if (seq === undefined || !seen.has(seq)) st.records.push(rec)
          }
          st.cursor = f.cursor ?? st.cursor
          st.hasMore = f.hasMore === true
          break
        }
        const closer = (iter as unknown as { return?: () => Promise<void> }).return
        if (typeof closer === 'function') { try { await closer.call(iter) } catch {} }
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
      // 「有这一轮」还不够：该轮可能**只有提问、回答尚未写入日志**（该轮刚结束不久）。
      // 这种情况也要补一次快照，否则卡片会永久缺回答。
      const entry = st?.map.get(targetTurn)
      const responseMissing = entry !== undefined && entry.response === ''
      const needMore = st === undefined || (targetTurn > 0 && entry === undefined)
      if (needMore) {
        void backfill(sessionId, targetTurn)
          .then(() => { const cur = historyCache.get(sessionId); if (cur !== undefined) onReady?.(cur.map) })
          .catch(() => {})
      } else if (responseMissing) {
        void refreshSnapshot(sessionId)
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
        /* ⚠️ 同一 key 也必须**同步内容**，不能只挪位置。
         *
         * 卡片常先以「仅有提问」创建（日志回填未完成、或该轮回答尚在流式输出），
         * 随后数据到位才补齐回答。若此处直接 return，回答就永远补不上，
         * 表现为「有些卡片有回答、有些没有」。 */
        const wantPrompt = promptText || `第 ${turnIndex + 1} 轮对话`
        const promptEl = currentCard.querySelector<HTMLElement>('.dsh-enhanced-preview-prompt')
        if (promptEl !== null && promptEl.textContent !== wantPrompt) promptEl.textContent = wantPrompt
        const respEl = currentCard.querySelector<HTMLElement>('.dsh-enhanced-preview-response')
        if (responseText !== '') {
          if (respEl !== null) {
            if (respEl.textContent !== responseText) respEl.textContent = responseText
          } else {
            const el = document.createElement('div')
            el.className = 'dsh-enhanced-preview-response'
            el.textContent = responseText
            promptEl?.after(el)
          }
        } else if (respEl !== null) {
          respEl.remove()
        }
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
      const rail = document.querySelector<HTMLElement>(SEL_FRAME)
      if (!rail) return

      if (starOnly) {
        rail.classList.add('dsh-filter-starred')
      } else {
        rail.classList.remove('dsh-filter-starred')
      }

      const starred = getStarredKeys()
      // 锚点为刻度按钮自身（新旧两代通用；新版已无 markPosition 包裹层且虚拟化）。
      const markItems = Array.from(rail.querySelectorAll<HTMLElement>(SEL_MARK_BUTTON))
      const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-chat-anchor-key]'))

      const promptRows = rows.filter((r) => r.dataset.chatFlowKind === 'user')
      const candidates = promptRows.length > 0 ? promptRows : rows

      /**
       * 把每个轨道刻度绑定到它对应的那一轮对话。
       *
       * 官方在同一份 DOM 上已经提供了权威的轮次信息，直接使用即可，不需要任何
       * 几何推算（实测刻度的 getBoundingClientRect 恒为 0，且滚动发生在内部
       * 容器而非 window，所以基于坐标的方案必然失败）：
       *   · 刻度按钮：aria-label 形如 "Jump to turn N" / "跳转到第 N 轮"（**含数字 N**）
       *   · 消息行：  data-chat-turn="N"（同时带 data-chat-flow-kind="user" 等）
       *
       * ⚠️ 历史踩坑：这里曾用「刻度在容器中的顺序号」当轮次号，理由是"aria-label 是
       * 本地化文案不可靠"。**这是错的**：本地化只影响模板文字，`{turn}` 始终是数字；
       * 而官方 items 的 turn 号**并不保证从 1 连续**（历史分页、会话压缩会产生空洞），
       * 序号一旦错位就会把**最新一轮**判成"尚未加载"。故一律以 aria-label 为准。
       *
       * ⚠️ 新版刻度**虚拟化**：DOM 里只有可见的那部分刻度，且滚动时元素被复用。
       * 因此这里每次调用都重新全量读取，绝不缓存刻度元素引用。
       */
      const userRowsByTurn = new Map<string, HTMLElement>()
      for (const row of candidates) {
        const turn = row.dataset.chatTurn
        if (turn !== undefined && turn !== '' && !userRowsByTurn.has(turn)) userRowsByTurn.set(turn, row)
      }
      markItems.forEach((markBtn) => {
        const turnNum = turnFromAriaLabel(markBtn)
        const row = turnNum > 0 ? userRowsByTurn.get(String(turnNum)) : undefined
        if (row !== undefined) markBtn.dataset.dshBoundKey = row.dataset.chatAnchorKey || ''
        else delete markBtn.dataset.dshBoundKey
      })

      /* 收藏 / 搜索高亮。
       *
       * ⚠️ 关键：这里必须用**轮次号**取对应消息行，**绝不能用刻度下标 `candidates[i]`**。
       * 官方轨道刻度数与「用户消息行」数**并不一一对应** —— 一次提问可能产生多个刻度
       * （工具调用、多段回复各占一个），下标一旦错位就会「收藏了 A 却高亮 B」
       * （实测：收藏最后一个节点，高亮的却是别的节点）。
       *
       * 轮次号同样以官方 aria-label 为唯一权威来源（与上面的绑定逻辑保持一致）。 */
      markItems.forEach((markEl) => {
        let isStar = false
        let isMatch = false

        const turnNum = turnFromAriaLabel(markEl)
        const row = turnNum > 0 ? userRowsByTurn.get(String(turnNum)) : undefined

        if (row !== undefined) {
          const anchorKey = row.dataset.chatAnchorKey || ''
          // 与 extractTurnContent 保持同一口径：优先气泡内文本（排除时间戳等旁支）。
          const bubble = row.querySelector<HTMLElement>('[class*="_bubble"]')
          const text = ((bubble ?? row).textContent || '').replace(/\s+/g, ' ').trim()
          const textKey = text.slice(0, 40)

          if ((anchorKey && starred.has(anchorKey)) || (textKey && starred.has(textKey))) {
            isStar = true
          }
          if (searchQuery && text.toLowerCase().includes(searchQuery)) {
            isMatch = true
          }
        }

        if (isStar) {
          markEl.classList.add('dsh-mark-starred')
        } else {
          markEl.classList.remove('dsh-mark-starred')
        }

        if (isMatch) {
          markEl.classList.add('dsh-mark-matched')
        } else {
          markEl.classList.remove('dsh-mark-matched')
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
      /* 提问文本：优先取**官方气泡内部**（`*_bubble`）的文本。
       *
       * ⚠️ 用户行（`*_userRow`）是 flex 纵向容器，除气泡外还含时间戳、工具栏等
       * 旁支元素；直接取整行 textContent 会把「17:07」这类内容混进卡片。 */
      const bubbleEl = userRow.querySelector<HTMLElement>('[class*="_bubble"]')
      const promptText = ((bubbleEl ?? userRow).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100)

      /* 回复：从该用户行往下找**该轮的回答正文**，遇到下一个用户行即停。
       *
       * ⚠️ 判据必须用**渲染类名**，不能用 `data-chat-flow-kind`。
       *
       * 官方 `data-chat-flow-kind` 的取值是**节点种类**（`assistant-step` / `tool-call` /
       * `turn-process` / `user` …），其中**根本没有 `text` 或 `reasoning`** ——
       * 那两个是 `assistant-step` **内部的内容块**类型。曾误以为 flow-kind 会是
       * "text"，结果一条回答都匹配不到（卡片只剩提问）。
       *
       * 官方的渲染对应关系（见 ChatView 的 block 渲染分支）：
       *   · block.kind === "text"      → 渲染为 MarkdownText（类名含 `markdown`）← 回答正文
       *   · block.kind === "reasoning" → 渲染为 ReasoningRow（类名 `*_thinkBody` 等）← 思考，跳过
       * 因此这里以「含 markdown 类名、且不含思考行特征」为准。 */
      let responseText = ''
      const startIndex = allRows.indexOf(userRow)
      if (startIndex >= 0) {
        for (let j = startIndex + 1; j < allRows.length; j++) {
          const nextRow = allRows[j]
          if (nextRow.dataset.chatFlowKind === 'user') break
          // 回答正文：官方用 MarkdownText 渲染，其根节点带 markdown 类名。
          const mdEl = nextRow.querySelector<HTMLElement>('[class*="markdown"]')
          if (mdEl === null) continue
          // 排除思考过程（ReasoningRow 内部也可能嵌 markdown）。
          if (mdEl.closest('[class*="thinkBody"], [class*="ReasoningRow"], [class*="reasoning"]') !== null) continue
          const rawText = (mdEl.textContent || '').replace(/\s+/g, ' ').trim()
          if (rawText !== '') {
            responseText = rawText.slice(0, 160)
            break
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

      /* 命中判定：必须精确落在官方 Turn Rail 的刻度按钮上。
       *
       * 锚点是**刻度按钮自身** `button[class*="_mark"][aria-label]` —— 该形态在
       * 官方新旧两代实现中都成立（旧版 `div.markPosition > button.mark`，
       * 新版 `div.marks > button.mark` 且按钮自身绝对定位）。
       *
       * ⚠️ 官方 0.2.0-rc.1 删除了 `markPosition` 类名并改为虚拟化渲染，此前依赖
       * `markPosition` 的选择器在新版下恒为空 → 悬停完全无反应。
       * ⚠️ 更早还用过裸子串 `[class*="mark"]`，会误命中 `.markDirty` / `.marker` 等
       * 小写类名 → 鼠标划过正文就疯狂弹卡片。故一律要求下划线前缀 `_mark`。 */
      const markBtn = target.closest<HTMLElement>(SEL_MARK_BUTTON)
      const rail = target.closest<HTMLElement>(SEL_FRAME)

      if (markBtn !== null && rail !== null) {
        const rect = markBtn.getBoundingClientRect()
        const centerY = rect.top + rect.height / 2

        const rightDist = window.innerWidth - rail.getBoundingClientRect().left + 12

        /* 轮次号的唯一权威来源：官方刻度 aria-label 里的 {turn} 数字。
         * 官方 items 的 turn 号**不保证从 1 连续**（历史分页/压缩会产生空洞），
         * 因此绝不能用「刻度序号」当轮次号 —— 那会把最新一轮判成未加载。 */
        const turnNum = turnFromAriaLabel(markBtn)
        const turn = turnNum > 0 ? String(turnNum) : ''
        const allRows = Array.from(document.querySelectorAll<HTMLElement>('[data-chat-anchor-key]'))
        // 当前会话 id：用于查会话日志（与 DOM 是否加载、滚动位置都无关）。
        const sid = currentSessionId()

        /* 三个数据源**合并**后再渲染，绝不用其中一个短路掉另一个。
         *
         * 为什么必须合并：提问与回答的到达时间**并不同步** ——
         *   · 会话日志里 prompt 往往先落库，response 要等该轮结束才写入；
         *   · DOM 里可能只渲染了其中一部分；
         *   · 官方预览卡（TurnNavigator 自己算的）在流式过程中也可能已有回答草稿。
         * 此前 `showFromData` 只要 prompt 非空就返回 true 并 return，
         * 于是「日志有提问、DOM 有回答」时**回答永远取不到**，
         * 表现为「有些卡片有 AI 回复、有些没有」。
         *
         * 现在三个源各字段独立取「第一个非空值」，优先级：
         *   会话日志（与滚动无关，最稳）→ DOM 消息行 → 官方预览卡。 */
        const readOfficial = (): { prompt: string; response: string } => {
          const promptEl = document.querySelector<HTMLElement>('[class*="previewPrompt"]')
          if (promptEl === null) return { prompt: '', response: '' }
          return {
            prompt: (promptEl.textContent ?? '').trim(),
            response: (promptEl.parentElement?.querySelector<HTMLElement>('[class*="previewResponse"]')?.textContent ?? '').trim(),
          }
        }

        const computeAndShow = (loggedMap: Map<number, TurnContent> | undefined): boolean => {
          const logged = loggedMap?.get(turnNum)
          const userRow = turn !== ''
            ? allRows.find((r) => r.dataset.chatTurn === turn && r.dataset.chatFlowKind === 'user')
            : undefined
          const dom = userRow !== undefined ? extractTurnContent(userRow) : undefined
          const official = readOfficial()

          // 各字段独立取第一个非空值：日志 → DOM → 官方预览卡。
          const promptText = logged?.prompt || dom?.promptText || official.prompt || ''
          const responseText = logged?.response || dom?.responseText || official.response || ''
          if (promptText === '' && responseText === '') return false

          showCard(
            turnNum - 1 >= 0 ? turnNum - 1 : 0,
            dom?.key || `turn:${turnNum}`,
            promptText,
            responseText,
            centerY,
            rightDist,
          )
          return true
        }

        // 目标轮次为 turnNum；缺这一轮时 turnsFor 会后台回填并在完成后回调。
        const cachedMap = sid !== ''
          ? turnsFor(sid, turnNum, (map) => {
              // 数据到位后，若鼠标仍停在**同一个轮次**的刻度上，立刻用合并结果刷新。
              // 注意：必须比对轮次号，不能比对刻度下标 —— turn 号不保证从 1 连续。
              const hoveredTurn = turnFromAriaLabel(
                document.querySelector<HTMLElement>(`${SEL_MARK_BUTTON}:hover`),
              )
              if (hoveredTurn === turnNum) computeAndShow(map)
            })
          : undefined
        if (computeAndShow(cachedMap)) return

        /* 日志与 DOM 都没有这一轮时，才提示「尚未加载」。
         *
         * 官方自己就用 `*_markUnloaded` 类名标注该轮未加载（TurnNavigator 中
         * `anchor.kind === 'unloaded'` 时把该类名 push 进 button 的 className），
         * 因此这里以官方标记为准。
         *
         * ⚠️ 关键：该类名加在**内层 button 自身**上，所以必须用 `matches()` /
         * `classList.contains()` 直接判定该元素；用 `closest()` 是往**祖先**找，
         * 永远找不到自己（曾因此让条件恒真、把所有预览卡都抑制掉）。
         *
         * 另外：若连轮次号都没解析出来（turnNum === 0），说明是**我们自己**没读懂
         * 官方 DOM，而不是这一轮没加载 —— 此时同样保持安静，绝不谎报「尚未加载」。 */
        const officialSaysUnloaded = markBtn.matches(SEL_MARK_UNLOADED)
        if (!officialSaysUnloaded || turnNum === 0) {
          // 官方认为该轮已加载（或我们无法判定），只是数据还没跟上 → 等回填回调。
          scheduleHide()
          return
        }
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
            // 与卡片/收藏同一口径：用户行优先取气泡内文本（排除时间戳等旁支元素）。
            const bubble = row.querySelector<HTMLElement>('[class*="_bubble"]')
            const text = ((bubble ?? row).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100)
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
