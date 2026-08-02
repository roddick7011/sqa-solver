import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Grade, Stage } from '../types'
import { getChapters, getSubject, STAGE_LABELS, GRADE_LABELS } from '../data/curriculum'

export default function ChapterPage() {
  const nav = useNavigate()
  const { stage, grade, subjectId } = useParams<{ stage: string; grade: string; subjectId: string }>()
  const s = stage!
  const g = Number(grade!) as Grade
  const subject = getSubject(s as Stage, g, subjectId!)
  const chapters = useMemo(() => getChapters(g, subjectId!), [g, subjectId])

  return (
    <div className="space-y-3">
      <div className="mb-2">
        <button onClick={() => nav(-1)} className="text-sm text-slate-500">← 回上一頁</button>
        <h2 className="text-lg font-bold mt-1">
          {subject?.emoji} {subject?.name} · {STAGE_LABELS[s as Stage]} {GRADE_LABELS[g]}
        </h2>
        <p className="text-xs text-slate-500">選擇要新增錯題的章節（可跳過，之後仍可編輯）</p>
      </div>

      {/* 全部章節 */}
      <button
        onClick={() => nav(`/stage/${s}/grade/${grade}/${subjectId}/ask`)}
        className="card p-3 w-full text-left flex items-center gap-3 hover:bg-slate-50"
      >
        <span className="text-2xl">📚</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">全部章節</div>
          <div className="text-xs text-slate-500">不指定章節，涵蓋所有範圍</div>
        </div>
      </button>

      {/* 個別章節 */}
      {chapters.map(ch => (
        <button
          key={ch.id}
          onClick={() => nav(`/stage/${s}/grade/${grade}/subject/${subjectId}/ask?chapterId=${encodeURIComponent(ch.id)}&chapterName=${encodeURIComponent(ch.name)}`)}
          className="card p-3 w-full text-left flex items-center gap-3 hover:bg-slate-50"
        >
          <span className="text-xl">📝</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{ch.name}</div>
            <div className="text-xs text-slate-400">{GRADE_LABELS[ch.grade]}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
