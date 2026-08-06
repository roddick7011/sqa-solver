// Supabase 連線工廠
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL_KEY = 'sqa:supabase-url'
const SUPABASE_ANON_KEY = 'sqa:supabase-anon-key'

export interface SupabaseConfig {
  url: string
  anonKey: string
}

export function loadSupabaseConfig(): SupabaseConfig | null {
  const url = localStorage.getItem(SUPABASE_URL_KEY)
  const anonKey = localStorage.getItem(SUPABASE_ANON_KEY)
  if (!url || !anonKey) return null
  return { url, anonKey }
}

export function saveSupabaseConfig(cfg: SupabaseConfig): void {
  localStorage.setItem(SUPABASE_URL_KEY, cfg.url)
  localStorage.setItem(SUPABASE_ANON_KEY, cfg.anonKey)
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(SUPABASE_URL_KEY)
  localStorage.removeItem(SUPABASE_ANON_KEY)
}

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  const cfg = loadSupabaseConfig()
  if (!cfg) return null
  if (_client) return _client
  // 08-06 修正：一律用「原 Supabase URL」當 baseUrl
  // - Realtime(WebSocket) 直連 supabase.co（Vercel rewrites 不代理 WS，之前 Android 全走 proxy → CHANNEL_ERROR）
  // - REST 請求則由 global.fetch 改寫走 Vercel proxy（解決 Android 跨域被擋）
  //   08-02 曾對 Android 直接改 baseUrl=proxy，修好了登入但弄壞了 realtime
  const isAndroid = /Android/i.test(navigator.userAgent)
  const supabaseOrigin = new URL(cfg.url).origin
  const proxyUrl = `${window.location.origin}/api/supabase`

  _client = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,  // 08-02 測試：關閉 background refresh（懷疑 Android 環境 fetch 定時器拋錯）
      detectSessionInUrl: false,
    },
    // Android：REST 請求改寫到 Vercel proxy（WS 不走 fetch，自動保持直連）
    global: isAndroid ? {
      fetch: (input: any, init?: any) => {
        const rawUrl = typeof input === 'string' ? input : input?.url
        if (!rawUrl) return fetch(input, init)
        const u = new URL(rawUrl)
        if (u.origin === supabaseOrigin) {
          u.protocol = window.location.protocol
          u.host = window.location.host
          u.pathname = '/api/supabase' + u.pathname
          return fetch(u.toString(), init)
        }
        return fetch(input, init)
      },
    } : undefined,
  })
  return _client
}

export function resetSupabaseClient(): void {
  _client = null
}

export function isValidSupabaseUrl(url: string): boolean {
  return /^https?:\/\/.+\.supabase\.co\/?$/.test(url.trim())
}