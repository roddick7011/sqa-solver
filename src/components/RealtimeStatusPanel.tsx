// 雲端同步狀態面板 — 顯示在 SettingsPage 最上方，手機也能看到
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../db/db'

export default function RealtimeStatusPanel() {
  const { user, realtimeStatus, syncing } = useAuth()
  const cloudCfg = localStorage.getItem('sqa:supabase-url') ? 's 已連線' : '未連線'
  const profileCount = useLiveQuery(() => db.profiles.count()) ?? 0
  const noteCount = useLiveQuery(() => db.notes.count()) ?? 0

  const statusColor = realtimeStatus === 'SUBSCRIBED'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
    : realtimeStatus === 'connecting'
    ? 'bg-amber-50 border-amber-200 text-amber-700'
    : realtimeStatus === 'CHANNEL_ERROR' || realtimeStatus === 'TIMED_OUT' || realtimeStatus === 'CLOSED'
    ? 'bg-rose-50 border-rose-200 text-rose-700'
    : 'bg-slate-50 border-slate-200 text-slate-500'

  const statusIcon = realtimeStatus === 'SUBSCRIBED' ? '🟢'
    : realtimeStatus === 'connecting' ? '🟡'
    : realtimeStatus === 'CHANNEL_ERROR' || realtimeStatus === 'TIMED_OUT' ? '🔴'
    : realtimeStatus === 'CLOSED' ? '⚫'
    : '⚪'

  return (
    <div className="card p-3 text-xs space-y-1.5">
      <div className="font-semibold text-sm">🐛 雲端同步狀態</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div>
          <span className="text-slate-500">連線：</span>
          <span className={cloudCfg.includes('已') ? 'text-emerald-700' : 'text-rose-600'}>
            {cloudCfg}
          </span>
        </div>
        <div>
          <span className="text-slate-500">登入：</span>
          <span className={user ? 'text-emerald-700' : 'text-rose-600'}>
            {user ? `✅ ${user.email}` : '❌ 未登入'}
          </span>
        </div>
        <div>
          <span className="text-slate-500">Realtime：</span>
          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${statusColor}`}>
            {statusIcon} {realtimeStatus}
          </span>
        </div>
        <div>
          <span className="text-slate-500">拉取中：</span>
          <span className={syncing ? 'text-amber-700' : 'text-slate-400'}>
            {syncing ? '⏳ 是' : '否'}
          </span>
        </div>
        <div>
          <span className="text-slate-500">本地 profiles：</span>
          <span>{profileCount}</span>
        </div>
        <div>
          <span className="text-slate-500">本地 notes：</span>
          <span>{noteCount}</span>
        </div>
      </div>
      {realtimeStatus === 'SUBSCRIBED' && (
        <div className="text-emerald-700 text-[11px]">
          ✅ 訂閱成功。其他裝置改資料會即時同步到這裡。
        </div>
      )}
      {realtimeStatus === 'CHANNEL_ERROR' && (
        <div className="text-rose-700 text-[11px]">
          ❌ 連線錯誤。請檢查網路或重新整理頁面。
        </div>
      )}
      {realtimeStatus === 'TIMED_OUT' && (
        <div className="text-rose-700 text-[11px]">
          ❌ 連線逾時。請檢查網路。
        </div>
      )}
      {(realtimeStatus === 'CLOSED' || realtimeStatus === 'offline') && user && (
        <div className="text-amber-700 text-[11px]">
          ⚠️ 尚未連線。重新整理頁面試試。
        </div>
      )}
    </div>
  )
}