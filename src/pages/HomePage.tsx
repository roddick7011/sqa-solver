import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { STAGE_LABELS, STAGE_GRADES } from '../data/curriculum'
import { calcStreak, filterDue } from '../utils/srs'
import { useProfile } from '../contexts/ProfileContext'
import { checkStreak, getState } from '../utils/gamification'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const { current } = useProfile()
  const notes = useLiveQuery(() => db.notes.toArray()) ?? []
  const myNotes = current ? notes.filter(n => n.profileId === current.id) : []
  const dueCount = filterDue(myNotes).length
  const streak = calcStreak(myNotes)
  const totalCount = myNotes.length

  // 🆕 Gamification
  const [gs, setGs] = useState(() => { checkStreak(); return getState() })
  useEffect(() => { const t = setInterval(() => setGs(getState()), 5000); return () => clearInterval(t) }, [])

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="text-xl font-bold">
          {current && <span className="mr-2">{current.emoji}</span>}
          {current ? `${current.name}，準備好解題了嗎？` : '準備好解題了嗎？'} 🐱
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          選一個學制開始。可以拍照題目或手打，AI 會給你詳解，再用康乃爾筆記整理。
        </p>
      </section>

      {/* 🆕 Gamification 面板 */}
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl">🔥</div>
              <div className="text-xs text-slate-500">連續</div>
              <div className="font-bold text-lg">{gs.streak}</div>
              <div className="text-xs text-slate-400">天</div>
            </div>
            <div className="text-center">
              <div className="text-2xl">⭐</div>
              <div className="text-xs text-slate-500">累積</div>
              <div className="font-bold text-lg">{gs.stars}</div>
              <div className="text-xs text-slate-400">顆</div>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 space-y-1">
            <div>今日目標：{gs.todayTarget} 題</div>
            <div>今日已寫：{gs.todayDone} 題</div>
            <div>凍結剩餘：{3 - gs.freezeUsed} / 3 次</div>
          </div>
        </div>
      </section>

      {totalCount > 0 && (
        <Link
          to="/review"
          className={`card p-5 flex items-center gap-4 active:scale-[0.99] transition-transform ${
            dueCount > 0 ? 'bg-gradient-to-br from-primary-50 to-white border-primary-200' : ''
          }`}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-primary-100">
            📚
          </div>
          <div className="flex-1">
            <div className="font-semibold text-lg">
              {dueCount > 0 ? `今日複習 ${dueCount} 題` : '今日複習'}
            </div>
            <div className="text-sm text-slate-500">
              {dueCount > 0
                ? '點擊開始複習，保持記憶不流失'
                : streak > 0
                  ? `🔥 連續 ${streak} 天，目前沒有待複習`
                  : '目前沒有待複習的錯題'}
            </div>
          </div>
          {dueCount > 0 && (
            <span className="bg-primary-600 text-white text-xs font-bold rounded-full px-2 py-1 min-w-6 text-center">
              {dueCount}
            </span>
          )}
          {dueCount === 0 && streak > 0 && (
            <span className="text-2xl">🔥</span>
          )}
          <span className="text-slate-400">›</span>
        </Link>
      )}

      {/* 🆕 自由解題：不需先選學制年級 */}
      <Link
        to="/ask"
        className="card p-5 flex items-center gap-4 active:scale-[0.99] transition-transform bg-gradient-to-br from-primary-50 to-white border-primary-200"
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-primary-600 text-white">
          ⚡
        </div>
        <div className="flex-1">
          <div className="font-semibold text-lg">AI 解題</div>
          <div className="text-sm text-slate-500">
            不確定是哪個年級？直接解題，之後再分類
          </div>
        </div>
        <span className="text-slate-400">›</span>
      </Link>

      <section className="space-y-3">
        {(['junior', 'senior'] as const).map(stage => (
          <Link
            key={stage}
            to={`/stage/${stage}`}
            className="card p-5 flex items-center gap-4 active:scale-[0.99] transition-transform"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${stage === 'junior' ? 'bg-amber-100' : 'bg-indigo-100'}`}>
              {stage === 'junior' ? '🎒' : '🎓'}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-lg">{STAGE_LABELS[stage]}</div>
              <div className="text-sm text-slate-500">
                {STAGE_GRADES[stage].map(g => `${g}年級`).join('・')}
              </div>
            </div>
            <span className="text-slate-400">›</span>
          </Link>
        ))}
      </section>

      <section className="card p-5">
        <h3 className="font-semibold mb-2">📌 康乃爾筆記法是什麼？</h3>
        <p className="text-sm text-slate-600">
          把筆記頁分成三區：<br/>
          • <b>左欄（Cues）</b>：關鍵字、公式、提問<br/>
          • <b>右欄（Notes）</b>：詳細解題過程<br/>
          • <b>底部（Summary）</b>：一句話總結或反思
        </p>
      </section>
    </div>
  )
}