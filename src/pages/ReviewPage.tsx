import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db/db'
import { GRADE_LABELS, getSubject, STAGE_LABELS } from '../data/curriculum'
import type { WrongNote } from '../types'
import { applyReview, filterDue, formatNextReview } from '../utils/srs'
import { formatAnswer } from '../utils/format'
import { saveAutoSnapshot } from '../utils/backup'
import StudentAnswerInput from '../components/StudentAnswerInput'
import { useProfile } from '../contexts/ProfileContext'
import { useAuth } from '../contexts/AuthContext'
import { pushNote } from '../cloud/sync'
import { notifySyncError } from '../utils/notify'

export default function ReviewPage() {
  const { current: activeProfile } = useProfile()
  const { user } = useAuth()
  const allNotes = useLiveQuery(() => db.notes.toArray()) ?? []
  const dueNotes = useMemo(
    () => activeProfile ? filterDue(allNotes.filter(n => n.profileId === activeProfile.id)) : [],
    [allNotes, activeProfile],
  )

  const [index, setIndex] = useState(0)
  const [studentAnswer, setStudentAnswer] = useState('')
  const [studentImages, setStudentImages] = useState<string[]>([])
  const [showCues, setShowCues] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })
  const [done, setDone] = useState(false)
  const [queue, setQueue] = useState<WrongNote[]>([])
  const [ready, setReady] = useState(false)

  // 進入頁面時，把 due 順序排好（先到期的優先；同到期則較舊的優先）
  useEffect(() => {
    if (queue.length === 0 && dueNotes.length > 0) {
      const sorted = [...dueNotes].sort((a, b) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0))
      setQueue(sorted)
      setReady(true)
    } else if (dueNotes.length === 0) {
      setReady(true)
    }
  }, [dueNotes, queue.length])

  const current = queue[index]

  // 進入下一題時重置
  useEffect(() => {
    setStudentAnswer('')
    setStudentImages([])
    setShowCues(false)
    setShowAnswer(false)
  }, [index])

  async function grade(result: 'correct' | 'wrong') {
    if (!current?.id) return
    const next = applyReview(current, result)
    await db.notes.update(current.id, next)
    // 同步到 Supabase（如果有登入）
    if (user) {
      const updated = await db.notes.get(current.id)
      if (updated) {
        try {
          await pushNote(user.id, updated)
        } catch (e: any) {
          notifySyncError('同步評分到雲端', e)
        }
      }
    }
    // 更新 SRS 狀態時順便做自動快照
    const all = await db.notes.toArray()
    saveAutoSnapshot(all)
    setStats(s => result === 'correct' ? { ...s, correct: s.correct + 1 } : { ...s, wrong: s.wrong + 1 })
    if (index + 1 >= queue.length) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
    }
  }

  function restart() {
    setQueue([])
    setIndex(0)
    setStats({ correct: 0, wrong: 0 })
    setDone(false)
  }

  if (!ready) {
    return (
      <div className="card p-8 text-center text-slate-500">
        <span className="inline-block w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-2" />
        載入複習題目…
      </div>
    )
  }

  if (dueNotes.length === 0 && !done) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">📚 今日複習</h2>
        <div className="card p-8 text-center text-slate-500">
          <div className="text-5xl mb-3">🎉</div>
          <div className="font-semibold mb-1">今天沒有要複習的錯題！</div>
          <div className="text-sm mb-4">所有錯題都已進入下一輪間隔。明天再來。</div>
          <Link to="/notebook" className="btn-secondary inline-block text-sm">看錯題本</Link>
        </div>
      </div>
    )
  }

  if (done) {
    const total = stats.correct + stats.wrong
    const accuracy = total > 0 ? Math.round(stats.correct / total * 100) : 0
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">🎉 今日複習完成</h2>
        <div className="card p-6 text-center space-y-3">
          <div className="text-5xl">{accuracy >= 80 ? '🌟' : accuracy >= 60 ? '💪' : '📚'}</div>
          <div className="text-2xl font-bold">{accuracy}% 答對</div>
          <div className="text-sm text-slate-600">
            總共 {total} 題 · ✓ {stats.correct} 答對 · ✗ {stats.wrong} 待加強
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link to="/notebook" className="btn-secondary text-sm py-3">看錯題本</Link>
          <button onClick={restart} className="btn-primary text-sm py-3">再來一輪</button>
        </div>
      </div>
    )
  }

  if (!current) return null

  const sub = getSubject(current.stage, current.grade, current.subjectId)
  const progress = `${index + 1} / ${queue.length}`

  return (
    <div className="space-y-4">
      {/* 進度條 */}
      <div className="flex items-center justify-between text-sm">
        <div className="font-semibold">📚 複習模式</div>
        <div className="text-slate-500">{progress}</div>
      </div>
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 transition-all"
          style={{ width: `${((index + 1) / queue.length) * 100}%` }}
        />
      </div>

      {/* 題目卡片 */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{sub?.emoji}</span>
          <span className="font-medium text-slate-700">{sub?.name}</span>
          <span>·</span>
          <span>{STAGE_LABELS[current.stage]} {GRADE_LABELS[current.grade]}</span>
          {current.intervalDays > 0 && (
            <span className="ml-auto text-xs text-slate-400">
              上次間隔 {current.intervalDays} 天 · EF {current.easeFactor.toFixed(2)}
            </span>
          )}
        </div>

        {current.questionImage && (
          <img src={current.questionImage} alt="題目" className="rounded-xl w-full max-h-64 object-contain bg-slate-100" />
        )}
        {current.questionText && (
          <div className="text-sm whitespace-pre-wrap text-slate-700 leading-relaxed">
            {current.questionText}
          </div>
        )}

        {/* Cues：預設隱藏，學生自己決定要不要偷看 */}
        {current.cues && !showAnswer && (
          <div className="rounded-xl bg-rose-50 border border-rose-200">
            {!showCues ? (
              <button
                type="button"
                onClick={() => setShowCues(true)}
                className="w-full text-left px-3 py-2 text-sm text-rose-700 font-medium hover:bg-rose-100 rounded-xl transition-colors"
              >
                💡 想看線索提示？
                <span className="text-xs text-rose-500 ml-1">（先自己想再偷看）</span>
              </button>
            ) : (
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-semibold text-rose-700">💡 線索提示</div>
                  <button
                    type="button"
                    onClick={() => setShowCues(false)}
                    className="text-xs text-rose-500 hover:text-rose-700"
                  >
                    ✕ 收起
                  </button>
                </div>
                <div className="text-sm whitespace-pre-wrap text-slate-800">{current.cues}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 學生作答區 */}
      {!showAnswer ? (
        <div className="card p-4 space-y-3">
          <label className="label">✍️ 你會怎麼解？寫下你的想法或答案</label>
          <StudentAnswerInput
            value={studentAnswer}
            onChange={setStudentAnswer}
            images={studentImages}
            onImagesChange={setStudentImages}
            rows={5}
          />
          <button
            onClick={() => setShowAnswer(true)}
            className="btn-primary w-full mt-2"
          >
            📝 提交並看解答
          </button>
          <button
            onClick={() => setShowAnswer(true)}
            className="btn-ghost text-xs w-full text-slate-500"
          >
            不知道怎麼解，先看 AI 解答 →
          </button>
        </div>
      ) : (
        <>
          {/* 對照區 */}
          {(studentAnswer.trim() || studentImages.length > 0) && (
            <div className="card p-4 space-y-2 bg-slate-50">
              <div className="text-xs font-semibold text-slate-500">你的作答</div>
              {studentAnswer.trim() && (
                <div className="text-sm whitespace-pre-wrap text-slate-700 leading-relaxed">
                  {studentAnswer}
                </div>
              )}
              {studentImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {studentImages.map((img, i) => (
                    <img key={i} src={img} alt={`作答圖 ${i + 1}`} className="rounded-lg w-full aspect-square object-cover bg-white border border-slate-200" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI 解答 + Notes + Summary */}
          <div className="card p-4 space-y-3">
            <div className="text-xs font-semibold text-emerald-700">✅ AI 解答</div>
            <div className="text-sm whitespace-pre-wrap text-slate-800 leading-relaxed">
              {formatAnswer(current.aiSolution)}
            </div>
          </div>

          {current.notes && current.notes !== current.aiSolution && (
            <div className="card p-4 space-y-2 bg-amber-50 border-amber-200">
              <div className="text-xs font-semibold text-amber-700">📝 Notes · 我的筆記</div>
              <div className="text-sm whitespace-pre-wrap text-slate-800 leading-relaxed">
                {formatAnswer(current.notes)}
              </div>
            </div>
          )}

          {current.summary && (
            <div className="card p-4 space-y-2 bg-emerald-50 border-emerald-200">
              <div className="text-xs font-semibold text-emerald-700">🎯 Summary · 重點摘要</div>
              <div className="text-sm whitespace-pre-wrap text-slate-800 leading-relaxed">
                {formatAnswer(current.summary)}
              </div>
            </div>
          )}

          {/* 評分 */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => grade('wrong')} className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-4 text-rose-700 font-medium active:bg-rose-100">
              <div className="text-2xl">✗</div>
              <div className="text-sm">答錯 / 不熟</div>
              <div className="text-xs text-rose-500 mt-0.5">明天再看</div>
            </button>
            <button onClick={() => grade('correct')} className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-4 text-emerald-700 font-medium active:bg-emerald-100">
              <div className="text-2xl">✓</div>
              <div className="text-sm">答對 / 已熟</div>
              <div className="text-xs text-emerald-500 mt-0.5">
                下次：{formatNextReview(applyReview(current, 'correct').nextReviewAt)}
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
