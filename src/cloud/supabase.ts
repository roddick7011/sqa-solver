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
  _client = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,  // 08-02 測試：關閉 background refresh（懷疑 Android 環境 fetch 定時器拋錯）
      detectSessionInUrl: false,
    },
  })
  return _client
}

export function resetSupabaseClient(): void {
  _client = null
}

export function isValidSupabaseUrl(url: string): boolean {
  return /^https?:\/\/.+\.supabase\.co\/?$/.test(url.trim())
}