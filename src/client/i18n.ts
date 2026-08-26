/**
 * 三语文案（中 / 英 / 西）。语言自动检测：优先跟随 DSH 平台语言（zh → 简体中文），
 * 其次浏览器语言（es → 西班牙语），其余默认简体中文。
 * @module dsh-chat-toc/client/i18n
 */

import { useSyncExternalStore } from 'react'

export type Lang = 'zh' | 'en' | 'es'

type Dict = Record<string, string>

const DICTS: Record<Lang, Dict> = {
  zh: {
    'toc.title': '对话目录',
    'toc.empty': '暂无对话消息',
    'toc.search': '搜索消息…',
    'toc.starOnly': '仅看收藏',
    'toc.starAdd': '收藏此消息',
    'toc.starRemove': '取消收藏',
    'toc.starEmpty': '暂无收藏消息',
    'toc.export': '复制对话大纲为 Markdown',
    'toc.exported': '已复制',
    'toc.searchEmpty': '无匹配消息',
    'toc.jump': '跳转到此消息',
  },
  en: {
    'toc.title': 'Table of contents',
    'toc.empty': 'No messages yet',
    'toc.search': 'Search messages…',
    'toc.starOnly': 'Starred only',
    'toc.starAdd': 'Star this message',
    'toc.starRemove': 'Unstar',
    'toc.starEmpty': 'No starred messages',
    'toc.export': 'Copy outline as Markdown',
    'toc.exported': 'Copied',
    'toc.searchEmpty': 'No matches',
    'toc.jump': 'Jump to this message',
  },
  es: {
    'toc.title': 'Índice de la conversación',
    'toc.empty': 'Aún no hay mensajes',
    'toc.search': 'Buscar mensajes…',
    'toc.starOnly': 'Solo destacados',
    'toc.starAdd': 'Destacar mensaje',
    'toc.starRemove': 'Quitar destacado',
    'toc.starEmpty': 'Sin mensajes destacados',
    'toc.export': 'Copiar índice como Markdown',
    'toc.exported': 'Copiado',
    'toc.searchEmpty': 'Sin resultados',
    'toc.jump': 'Ir a este mensaje',
  },
}

/** 平台 locale 服务的结构面孔（见 index.ts）。 */
interface LocaleService {
  getLocale(): { active: string }
  subscribe(fn: () => void): () => void
}

let locale: LocaleService | null = null
let lang: Lang = 'zh'
let revision = 0
const listeners = new Set<() => void>()

function notify(): void {
  revision += 1
  for (const fn of listeners) fn()
}

function detectLang(): Lang {
  const active = locale?.getLocale().active
  if (active === 'zh') return 'zh'
  const nav = (navigator.language || '').toLowerCase()
  if (nav.startsWith('es')) return 'es'
  if (active === 'en') return 'en'
  if (nav.startsWith('zh')) return 'zh'
  return 'zh'
}

/** 接入平台 locale 服务；从 client 入口调用一次。 */
export function initI18n(service: LocaleService): void {
  if (locale === service) return
  locale = service
  lang = detectLang()
  service.subscribe(() => {
    const next = detectLang()
    if (next !== lang) {
      lang = next
      notify()
    }
  })
}

const subscribe = (fn: () => void): (() => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

const getSnapshot = (): number => revision

/** 翻译；缺失的 key 回退到中文。 */
export function t(key: string): string {
  return DICTS[lang][key] ?? DICTS.zh[key] ?? key
}

/** React hook：语言切换时触发重渲染；返回的 t() 为模块级稳定引用。 */
export function useT(): (key: string) => string {
  useSyncExternalStore(subscribe, getSnapshot)
  return t
}
