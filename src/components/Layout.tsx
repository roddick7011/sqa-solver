import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { filterDue } from '../utils/srs'
import { useProfile } from '../contexts/ProfileContext'
import { useAuth } from '../contexts/AuthContext'
import ProfilePicker from './ProfilePicker'
import ProfileSetupModal from './ProfileSetupModal'

export default function Layout() {
  const nav = useNavigate()
  const { current, ready } = useProfile()
  const { user, signOut } = useAuth()
  const notes = useLiveQuery(() => db.notes.toArray()) ?? []
  const dueNotes = current ? notes.filter(n => n.profileId === current.id) : []
  const dueCount = filterDue(dueNotes).length

  // 首次進入、若有 profile 但還沒 ready（currentId 還沒同步好），等一下
  const showSetup = !ready

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-screen-md mx-auto flex items-center px-4 h-14 gap-1">
          <button
            onClick={() => nav(-1)}
            className="btn-ghost -ml-2 mr-1"
            aria-label="上一頁"
          >
            ←
          </button>
          <h1 className="text-base font-semibold flex-1 truncate">
            <NavLink to="/" className="flex items-center gap-2">
              <span className="inline-flex w-7 h-7 rounded-lg bg-primary-600 items-center justify-center text-white font-bold">解</span>
              <span className="hidden sm:inline">解題小幫手</span>
            </NavLink>
          </h1>
          <ProfilePicker />
          {user ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500 hidden md:inline" title={user.email}>
                {user.email?.split('@')[0] ?? '用戶'}
              </span>
              <button
                onClick={async () => {
                  if (confirm('確定要登出？')) await signOut()
                }}
                className="btn-ghost text-xs px-2 py-1.5"
                aria-label="登出"
                title="登出"
              >
                登出
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className="btn-ghost text-sm px-2 py-1.5"
              aria-label="登入"
            >
              登入
            </a>
          )}
          <a
            href="/review"
            className="btn-ghost relative"
            aria-label="複習"
            style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}
          >
            🔁
            {dueCount > 0 && (
              <span className="pointer-events-none absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                {dueCount}
              </span>
            )}
          </a>
          <a
            href="/settings"
            className="btn-ghost"
            aria-label="設定"
            style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}
          >
            ⚙️
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-screen-md w-full mx-auto px-4 py-4 pb-24">
        {ready && <Outlet />}
      </main>

      <footer className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-100">
        <div className="max-w-screen-md mx-auto grid grid-cols-4 px-2 py-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center py-2 text-xs ${isActive ? 'text-primary-600' : 'text-slate-500'}`
            }
          >
            <span className="text-xl">🏠</span>
            <span>首頁</span>
          </NavLink>
          <a
            href="/review"
            className="flex flex-col items-center py-2 text-xs relative text-slate-500"
            aria-label="複習"
          >
            <span className="text-xl">🔁</span>
            <span>複習</span>
            {dueCount > 0 && (
              <span className="pointer-events-none absolute top-1 right-1/4 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                {dueCount}
              </span>
            )}
          </a>
          <NavLink
            to="/notebook"
            className={({ isActive }) =>
              `flex flex-col items-center py-2 text-xs ${isActive ? 'text-primary-600' : 'text-slate-500'}`
            }
          >
            <span className="text-xl">📚</span>
            <span>錯題本</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-col items-center py-2 text-xs ${isActive ? 'text-primary-600' : 'text-slate-500'}`
            }
          >
            <span className="text-xl">⚙️</span>
            <span>設定</span>
          </NavLink>
        </div>
      </footer>

      <ProfileSetupModal open={showSetup} />
    </div>
  )
}