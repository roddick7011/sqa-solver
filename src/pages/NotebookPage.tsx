import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { GRADE_LABELS, getSubject, STAGE_GRADES, STAGE_LABELS } from '../data/curriculum'
import { formatNextReview } from '../utils/srs'
import type { Grade, Stage } from '../types'
import { useProfile } from '../contexts/ProfileContext'
import { useAuth } from '../contexts/AuthContext'
import { deleteCloudNote } from '../cloud/sync'
import { notifySyncError } from '../utils/notify'

export default function NotebookPage() {
  const { current } = useProfile()
  const { user } = useAuth()
  const allNotes = useLiveQuery(() =>
    db.notes.orderBy('createdAt').reverse().toArray()
  , []) ?? []
  const notes = useMemo(
    () => current ? allNotes.filter(n => n.profileId === current.id) : [],
    [allNotes, current],
  )

  const [filterStage, setFilterStage] = useState<Stage | 'all'>('all')
  const [filterGrade, setFilterGrade] = useState<Grade | 'all'>('all')
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [onlyStarred, setOnlyStarred] = useState(false)

  const filtered = useMemo(() => {
    return notes.filter(n => {
      if (filterStage !== 'all' && n.stage !== filterStage) return false
      if (filterGrade !== 'all' && n.grade !== filterGrade) return false
      if (filterSubject !== 'all' && n.subjectId !== filterSubject) return false
      if (onlyStarred && !n.starred) return false
      return true
    })
  }, [notes, filterStage, filterGrade, filterSubject, onlyStarred])

  async function deleteNote(id: number) {
    if (!confirm('確定要刪除這筆錯題嗎？')) return
    // 先取出 note（用來同步刪除雲端）
    const note = await db.notes.get(id)
    await db.notes.delete(id)
    // 同步到 Supabase（如果有登入）
    if (user && note) {
      try {
        await deleteCloudNote(id, user.id, note.profileId)
      } catch (e: any) {
        notifySyncError('從雲端刪除錯題', e)
      }
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">📚 我的錯題本</h2>

      <div className="card p-3 space-y-2">
        <select
          value={filterStage}
          onChange={e => {
            const v = e.target.value as Stage | 'all'
            setFilterStage(v)
            setFilterGrade('all')
            setFilterSubject('all')
          }}
          className="input"
        >
          <option value="all">全部學制</option>
          <option value="junior">{STAGE_LABELS.junior}</option>
          <option value="senior">{STAGE_LABELS.senior}</option>
        </select>
        {filterStage !== 'all' && (
          <select
            value={filterGrade}
            onChange={e => {
              const v = e.target.value
              setFilterGrade(v === 'all' ? 'all' : (parseInt(v, 10) as Grade))
              setFilterSubject('all')
            }}
            className="input"
          >
            <option value="all">全部年級</option>
            {STAGE_GRADES[filterStage].map(g => (
              <option key={g} value={g}>{GRADE_LABELS[g]}</option>
            ))}
          </select>
        )}
        {filterGrade !== 'all' && filterStage !== 'all' && (
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="input"
          >
            <option value="all">全部科目</option>
            {/* 從 notes 中蒐集實際用過的科目 */}
            {Array.from(new Set(notes.filter(n => n.stage === filterStage && n.grade === filterGrade).map(n => n.subjectId)))
              .map(sid => {
                const sub = getSubject(filterStage, filterGrade as Grade, sid)
                return sub ? <option key={sid} value={sid}>{sub.emoji} {sub.name}</option> : null
              })}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyStarred}
            onChange={e => setOnlyStarred(e.target.checked)}
          />
          只看星號
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <div className="text-4xl mb-2">📭</div>
          <div>還沒有錯題，先去解題吧！</div>
          <Link to="/" className="btn-primary mt-4 inline-block">回到首頁</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => {
            const sub = getSubject(n.stage, n.grade, n.subjectId)
            return (
              <div key={n.id} className="card p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{sub?.emoji}</span>
                  <span className="font-medium text-slate-700">{sub?.name}</span>
                  <span>·</span>
                  <span>{STAGE_LABELS[n.stage]} {GRADE_LABELS[n.grade]}</span>
                  {n.starred && <span>⭐</span>}
                  <span className="ml-auto">
                    {new Date(n.createdAt).toLocaleDateString('zh-TW')}
                  </span>
                </div>
                {n.nextReviewAt != null && !n.starred && (
                  <div className="text-xs">
                    <span className={
                      n.nextReviewAt <= Date.now()
                        ? 'text-rose-600 font-medium'
                        : 'text-slate-500'
                    }>
                      🔁 {n.nextReviewAt <= Date.now() ? '今日可複習' : `下次：${formatNextReview(n.nextReviewAt)}`}
                    </span>
                    {n.lastResult && (
                      <span className="ml-2 text-slate-400">
                        · 上次 {n.lastResult === 'correct' ? '✓' : '✗'}
                        {n.intervalDays > 0 ? ` · 間隔 ${n.intervalDays} 天` : ''}
                      </span>
                    )}
                  </div>
                )}
                <div className="text-sm font-semibold line-clamp-2">
                  {n.summary || n.cues || n.questionText.slice(0, 80) || '(無標題)'}
                </div>
                {n.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {n.tags.map((t, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Link
                    to={`/stage/${n.stage}/grade/${n.grade}/subject/${n.subjectId}/note/${n.id}`}
                    className="btn-secondary text-sm flex-1"
                  >
                    開啟
                  </Link>
                  <button
                    onClick={() => n.id != null && deleteNote(n.id)}
                    className="btn-ghost text-sm text-rose-600"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
