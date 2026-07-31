import { useState } from 'react'
import { db } from '../db/db'
import { useProfile } from '../contexts/ProfileContext'
import { makeProfile, pickRandomEmoji, PROFILE_EMOJIS } from '../utils/profile'

interface Props {
  open: boolean
}

export default function ProfileSetupModal({ open }: Props) {
  const { setCurrentId, activeProfiles } = useProfile()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(() => pickRandomEmoji())
  const [busy, setBusy] = useState(false)

  if (!open) return null

  // 若已有 profile 但還沒選中，提示選一個
  if (activeProfiles.length > 0) {
    return null
  }

  async function onCreate() {
    if (!name.trim()) return
    setBusy(true)
    try {
      const p = makeProfile(name, emoji)
      await db.profiles.put(p)
      setCurrentId(p.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2">👋</div>
          <h2 className="text-xl font-bold">歡迎！建立第一個小孩的帳號</h2>
          <p className="text-sm text-slate-500 mt-1">
            這台裝置可以有多個小孩的錯題本。建立第一個後，之後可在設定頁新增更多。
          </p>
        </div>

        <div>
          <label className="label">名字（暱稱就好）</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="input"
            placeholder="例如：小華、小明"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') onCreate() }}
          />
        </div>

        <div>
          <label className="label">選個頭像</label>
          <div className="flex flex-wrap gap-2">
            {PROFILE_EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`w-10 h-10 rounded-xl text-2xl flex items-center justify-center border transition-all ${
                  emoji === e
                    ? 'bg-primary-100 border-primary-500 scale-110'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onCreate}
          disabled={!name.trim() || busy}
          className="btn-primary w-full"
        >
          {busy ? '建立中…' : `建立 ${emoji} ${name || '小朋友'} 的帳號`}
        </button>

        <p className="text-xs text-slate-400 text-center">
          之後在設定頁可新增、重新命名、刪除帳號。
        </p>
      </div>
    </div>
  )
}