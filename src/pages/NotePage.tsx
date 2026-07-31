import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GRADE_LABELS, getSubject, STAGE_LABELS } from '../data/curriculum'
import type { Grade, Stage, WrongNote } from '../types'
import { db } from '../db/db'
import { formatAnswer } from '../utils/format'
import { loadAIConfig, makeSolver } from '../ai/solver'
import { makeInitialReviewState } from '../utils/srs'
import { saveAutoSnapshot } from '../utils/backup'
import { useProfile } from '../contexts/ProfileContext'
import { useAuth } from '../contexts/AuthContext'
import { pushNote } from '../cloud/sync'
import { notifySyncError } from '../utils/notify'
import CornellEditor from '../components/CornellEditor'

const DRAFT_KEY = 'sqa:pending-solution'

export default function NotePage() {
  const { stage, grade, subject, id } = useParams()
  const nav = useNavigate()
  const { current } = useProfile()
  const { user } = useAuth()
  const s = stage as Stage
  const g = parseInt(grade!, 10) as Grade
  const sub = getSubject(s, g, subject!)!

  const [cues, setCues] = useState('')
  const [notes, setNotes] = useState('')
  const [summary, setSummary] = useState('')
  const [starred, setStarred] = useState(false)
  const [tagsInput, setTagsInput] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [questionImage, setQuestionImage] = useState<string | undefined>()
  const [aiSolution, setAiSolution] = useState('')
  const [saved, setSaved] = useState(false)
  const [editingId, setEditingId] = useState<number | undefined>(undefined)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (id && id !== 'new') {
      // 編輯既有筆記
      db.notes.get(parseInt(id, 10)).then(n => {
        if (!n) return
        setCues(n.cues)
        setNotes(n.notes)
        setSummary(n.summary)
        setStarred(n.starred)
        setTagsInput(n.tags.join(', '))
        setQuestionText(n.questionText)
        setQuestionImage(n.questionImage)
        setAiSolution(n.aiSolution)
        setEditingId(n.id)
      })
    } else {
      // 從 QuestionPage 來的草稿
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (raw) {
        try {
          const d = JSON.parse(raw)
          setQuestionText(d.questionText || '')
          setQuestionImage(d.questionImage)
          setAiSolution(d.aiSolution || '')
          // 預設 notes 帶入 AI 解答，cues/summary 用 AI 預填的（如果有的話）
          setNotes(d.aiSolution || '')
          setCues(d.aiCues || '')
          setSummary(d.aiSummary || '')
        } catch {}
      }
    }
  }, [id])

  async function onAnalyzeCornell() {
    if (!aiSolution) {
      setAnalyzeError('需要先有 AI 詳解才能分析')
      return
    }
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setAnalyzing(true)
    setAnalyzeError('')
    try {
      const solver = makeSolver(loadAIConfig())
      const r = solver.analyzeCornell(
        {
          questionText,
          questionImage,
          aiSolution,
          subjectName: sub.name,
          gradeLabel: `${STAGE_LABELS[s]}・${GRADE_LABELS[g]}`,
        },
        abortRef.current.signal,
      )
      const result = await r
      setCues(prev => prev ? `${prev}\n${result.cues}` : result.cues)
      setSummary(prev => prev ? `${prev}\n${result.summary}` : result.summary)
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setAnalyzeError(e?.message ?? 'AI 分析失敗')
    } finally {
      setAnalyzing(false)
    }
  }

  function onCancelAnalyze() {
    abortRef.current?.abort()
    setAnalyzing(false)
  }

  async function onSave() {
    if (!current) return
    const now = Date.now()
    const note: WrongNote = {
      createdAt: now,
      profileId: current.id,
      stage: s,
      grade: g,
      subjectId: subject!,
      questionText,
      questionImage,
      aiSolution,
      cues,
      notes,
      summary,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      starred,
      ...makeInitialReviewState(now),
    }
    if (editingId != null) {
      const { id: _omit, ...rest } = note as WrongNote & { id?: number }
      await db.notes.update(editingId, rest)
    } else {
      await db.notes.add(note)
    }

    // 取出剛剛存的 note（含 local id）
    let savedNote: WrongNote | undefined
    if (editingId != null) {
      savedNote = await db.notes.get(editingId)
    } else {
      // db.notes.add 會回傳新增的 local id
      const all = await db.notes
        .where('profileId').equals(note.profileId)
        .reverse()
        .sortBy('createdAt')
      savedNote = all[0]
    }

    // 同步到 Supabase（如果有登入）
    if (user && savedNote) {
      try {
        await pushNote(user.id, savedNote)
        console.info('[sqa] 已同步到 Supabase')
      } catch (e: any) {
        notifySyncError('同步錯題到雲端', e)
      }
    }

    sessionStorage.removeItem(DRAFT_KEY)
    // 自動快照（防 IndexedDB 被清時能救回），只備份目前 profile 的 notes
    const all = await db.notes.toArray()
    const myNotes = current ? all.filter(n => n.profileId === current.id) : all
    saveAutoSnapshot(myNotes)
    setSaved(true)
    setTimeout(() => nav('/notebook'), 600)
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-xl">
          {sub.emoji}
        </div>
        <div className="flex-1">
          <div className="font-semibold">{sub.name}</div>
          <div className="text-xs text-slate-500">{STAGE_LABELS[s]}・{GRADE_LABELS[g]}</div>
        </div>
        <button
          onClick={() => setStarred(s => !s)}
          className="btn-ghost text-xl"
          aria-label="星號"
        >
          {starred ? '⭐' : '☆'}
        </button>
      </div>

      {(questionText || questionImage) && (
        <>
          {/* 題目：永遠展開（學生該看得到題目） */}
          <div className="card p-4">
            <div className="font-semibold text-sm mb-2">📋 題目</div>
            <div className="space-y-3">
              {questionImage && <img src={questionImage} className="rounded-xl max-h-72 w-full object-contain bg-slate-100" />}
              {questionText && (
                <div className="text-sm whitespace-pre-wrap text-slate-700">
                  {questionText}
                </div>
              )}
            </div>
            {aiSolution && (
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-amber-700">
                💡 先自己想看看，真的想不出來再看 AI 解答 ↓
              </div>
            )}
          </div>

          {/* AI 解答：預設折疊，需點擊才展開 */}
          {aiSolution && (
            <details className="card p-4">
              <summary className="cursor-pointer font-semibold text-sm text-primary-700">
                🤖 AI 解答（點擊展開）
              </summary>
              <div className="mt-3 text-sm whitespace-pre-wrap text-slate-700">
                {formatAnswer(aiSolution)}
              </div>
            </details>
          )}
        </>
      )}

      <div className="card p-4">
        <CornellEditor
          cues={cues}
          notes={notes}
          summary={summary}
          onChange={({ cues, notes, summary }) => {
            setCues(cues); setNotes(notes); setSummary(summary)
          }}
        />
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
          {analyzing ? (
            <>
              <button onClick={onCancelAnalyze} className="btn-secondary text-sm py-2 flex-1">取消</button>
              <div className="flex-1 text-xs text-slate-500 flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                AI 分析中…
              </div>
            </>
          ) : (
            <button onClick={onAnalyzeCornell} className="btn-secondary text-sm py-2 flex-1">
              ✨ AI 分析 Cues / Summary
            </button>
          )}
        </div>
        {analyzeError && (
          <div className="mt-2 text-xs text-rose-600">⚠️ {analyzeError}</div>
        )}
        <div className="mt-2 text-xs text-slate-500">
          💡 AI 預填後可直接修改。cues 為涵蓋的單元/概念，summary 為考點/技巧/注意事項。
        </div>
      </div>

      <div className="card p-4 space-y-2">
        <label className="label">🏷️ 標籤（用逗號分隔）</label>
        <input
          type="text"
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
          className="input"
          placeholder="例如：易錯, 觀念混淆, 公式題"
        />
      </div>

      <button onClick={onSave} className="btn-primary w-full">
        💾 儲存錯題筆記
      </button>

      {saved && (
        <div className="card p-3 border-emerald-200 bg-emerald-50 text-emerald-700 text-sm text-center">
          ✅ 已儲存！正在回到錯題本...
        </div>
      )}
    </div>
  )
}
