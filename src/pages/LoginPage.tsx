import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { loadSupabaseConfig } from '../cloud/supabase'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const { signIn, signUp, user, loading } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const hasCloud = !!loadSupabaseConfig()

  // 已經登入就直接回首頁
  useEffect(() => {
    if (!loading && user) nav('/')
  }, [user, loading, nav])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    // 沒連線 Supabase 自動導向設定頁
    if (!hasCloud) {
      nav('/settings')
      return
    }
    if (!email || !password) {
      setError('請填 email 和密碼')
      return
    }
    if (password.length < 6) {
      setError('密碼至少 6 個字元')
      return
    }
    setBusy(true)
    setError('')
    
    // 08-02 debug：先用純 fetch 打 Supabase health 確認 Android 是否能 fetch
    const cfg = loadSupabaseConfig()
    if (cfg) {
      try {
        setError('🔍 測試連線中...')
        const testRes = await fetch(`${cfg.url}/auth/v1/health`, {
          method: 'GET',
          headers: { 'apikey': cfg.anonKey },
        })
        setError(`🔍 fetch OK (status=${testRes.status})，嘗試登入...`)
      } catch (e: any) {
        setError(`❌ 純 fetch 失敗：${e?.message ?? e}`)
        setBusy(false)
        return
      }
    }
    
    const fn = mode === 'signin' ? signIn : signUp
    const { error } = await fn(email, password)
    setBusy(false)
    if (error) {
      setError(translateError(error))
    } else {
      if (mode === 'signup') {
        setError('✅ 註冊成功！請到信箱收確認信（或關閉「Confirm email」已可登入）')
      }
      // 登入成功會自動 navigate
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <div className="text-center">
        <div className="text-4xl mb-2">🔐</div>
        <h1 className="text-2xl font-bold">{mode === 'signin' ? '登入' : '註冊帳號'}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {mode === 'signin'
            ? '歡迎回來！解題、複習、雲端同步都需要登入。'
            : '用 email 註冊。帳號 = 一個家庭，底下可建多個小孩 profile。'}
        </p>
      </div>

      {!hasCloud && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-2">
          <div className="font-semibold text-amber-800">⚠️ 這台裝置還沒連線 Supabase</div>
          <div className="text-amber-700">
            登入需要先設定雲端連線。請到「設定」頁填入 Supabase URL 和 anon key（每台裝置只填一次）。
          </div>
          <button
            type="button"
            onClick={() => nav('/settings')}
            className="btn-primary text-sm py-2 mt-2"
          >
            ⚙️ 前往設定
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="card p-4 space-y-3">
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
          />
        </div>
        <div>
          <label className="label">密碼</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="input"
            placeholder="至少 6 個字元"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
        </div>

        {error && (
          <div className={`text-sm ${error.startsWith('✅') ? 'text-emerald-700' : 'text-rose-600'}`}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full"
        >
          {busy ? '處理中…' : (mode === 'signin' ? '登入' : '註冊')}
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}
          className="text-sm text-primary-600 hover:underline"
        >
          {mode === 'signin' ? '還沒帳號？改成註冊' : '已有帳號？改成登入'}
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center">
        ⚠️ 雲端服務由 Supabase 提供。註冊前請確認已到「設定」頁填入 Supabase URL 和 anon key。
      </p>
    </div>
  )
}

function translateError(message: string): string {
  // Supabase 常見錯誤訊息翻譯
  if (message.includes('Invalid login credentials')) return '帳號或密碼錯誤'
  if (message.includes('User already registered')) return '此 email 已註冊，請改登入'
  if (message.includes('Email not confirmed')) return '請先到信箱收確認信（或關閉 Confirm email 設定）'
  if (message.includes('Password should be')) return '密碼強度不足，請設定至少 6 字元'
  if (message.includes('rate limit')) return '嘗試次數過多，請稍後再試'
  return message
}