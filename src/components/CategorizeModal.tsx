import { useEffect, useState } from 'react'
import { GRADE_LABELS, getChapters, getSubjects, STAGE_GRADES, STAGE_LABELS } from '../data/curriculum'
import type { Grade, Stage } from '../types'

export interface Category {
  stage: Stage
  grade: Grade
  subjectId: string
  chapterId?: string
}

export default function CategorizeModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (cat: Category) => void
}) {
  const [stage, setStage] = useState<Stage>('junior')
  const [grade, setGrade] = useState<Grade>(7)
  const [subjectId, setSubjectId] = useState<string>('')
  const [chapterId, setChapterId] = useState<string>('all')

  // 每次開啟重置
  useEffect(() => {
    if (!open) return
    setStage('junior')
    setGrade(7)
    setSubjectId('')
    setChapterId('all')
  }, [open])

  const grades = STAGE_GRADES[stage]
  const subjects = getSubjects(stage, grade)
  const chapters = subjectId ? getChapters(grade, subjectId) : []

  function confirm() {
    if (!subjectId) {
      alert('請選擇科目')
      return
    }
    onConfirm({
      stage,
      grade,
      subjectId,
      chapterId: chapterId === 'all' ? undefined : chapterId,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 bg-black/40 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="font-semibold">🗂️ 分類這題</div>
          <button onClick={onClose} aria-label="關閉" className="btn-ghost text-base px-2">✕</button>
        </div>

        <label className="block">
          <span className="label">學制</span>
          <select
            value={stage}
            onChange={e => {
              const s = e.target.value as Stage
              setStage(s)
              setGrade(STAGE_GRADES[s][0])
              setSubjectId('')
              setChapterId('all')
            }}
            className="input"
          >
            {(['junior', 'senior'] as const).map(s => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">年級</span>
          <select
            value={grade}
            onChange={e => {
              setGrade(parseInt(e.target.value, 10) as Grade)
              setSubjectId('')
              setChapterId('all')
            }}
            className="input"
          >
            {grades.map(g => (
              <option key={g} value={g}>{GRADE_LABELS[g]}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">科目</span>
          <select
            value={subjectId}
            onChange={e => {
              setSubjectId(e.target.value)
              setChapterId('all')
            }}
            className="input"
          >
            <option value="">請選擇科目</option>
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.emoji} {sub.name}</option>
            ))}
          </select>
        </label>

        {subjectId && chapters.length > 0 && (
          <label className="block">
            <span className="label">章節（可選）</span>
            <select
              value={chapterId}
              onChange={e => setChapterId(e.target.value)}
              className="input"
            >
              <option value="all">不指定章節</option>
              {chapters.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.name}</option>
              ))}
            </select>
          </label>
        )}

        <button onClick={confirm} className="btn-primary w-full">
          確認，存入錯題本
        </button>
      </div>
    </div>
  )
}
