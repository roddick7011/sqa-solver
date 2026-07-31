import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'

export default function ProfilePicker() {
  const { activeProfiles, current, setCurrentId } = useProfile()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const nav = useNavigate()

  // 點外面關閉
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (!current) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors"
        aria-label="切換帳號"
      >
        <span className="text-base">{current.emoji}</span>
        <span className="text-sm font-medium text-slate-700 max-w-20 truncate">{current.name}</span>
        <span className="text-xs text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 min-w-48 z-30 py-1">
          {activeProfiles.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setCurrentId(p.id)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 ${
                p.id === current.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-700'
              }`}
            >
              <span className="text-lg">{p.emoji}</span>
              <span className="flex-1 truncate">{p.name}</span>
              {p.id === current.id && <span className="text-primary-600 text-xs">✓</span>}
            </button>
          ))}
          <div className="border-t border-slate-100 my-1" />
          <button
            type="button"
            onClick={() => { setOpen(false); nav('/settings') }}
            className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
          >
            <span>⚙️</span>
            <span>管理帳號…</span>
          </button>
        </div>
      )}
    </div>
  )
}