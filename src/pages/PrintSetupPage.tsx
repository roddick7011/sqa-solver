import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { GRADE_LABELS, getChapters, STAGE_GRADES, STAGE_LABELS } from '../data/curriculum'
import type { Grade, Stage } from '../types'
import { useProfile } from '../contexts/ProfileContext'

// 與 PrintPage 共享的 key
export const PRINT_KEY = 'sqa:print-config'

export interface PrintConfig {
  stage: Stage | 'all'
  grade: Grade | 'all'
  subjectId: string | 'all'
  chapters: string[]          // 空陣列 = 全部章節
  limit: number               // 0 = 全部
  mode: 'random' | 'hard'     // 隨機 / 高錯題優先
  version: 'student' | 'answer'  // 派題本 / 解答本
}

export default function PrintSetupPage() {
  const nav = useNavigate()
  const { current } = useProfile()
  const allNotes = useLiveQuery(() => db.notes.toArray(), []) ?? []
  const notes = useMemo(
    () => current ? allNotes.filter(n => n.profileId === current.id) : [],
    [allNotes, current],
  )

  const [stage, setStage] = useState<Stage | 'all'>('all')
  const [grade, setGrade] = useState<Grade | 'all'>('all')
  const [subjectId, setSubjectId] = useState<string>('all')
  const [chapters, setChapters] = useState<string[]>([])
  const [limit, setLimit] = useState(10)
  const [mode, setMode] = useState<'random' | 'hard'>('random')
  const [version, setVersion] = useState<'student' | 'answer'>('student')

  // 可出題數
  const available = useMemo(() => {
    return notes.filter(n => {
      if (stage !== 'all' && n.stage !== stage) return false
      if (grade !== 'all' && n.grade !== grade) return false
      if (subjectId !== 'all' && n.subjectId !== subjectId) return false
      if (chapters.length > 0 && (!n.chapterId || !chapters.includes(n.chapterId))) return false
      return true
    }).length
  }, [notes, stage, grade, subjectId, chapters])

  function onGenerate() {
    const config: PrintConfig = {
      stage, grade, subjectId, chapters, limit, mode, version,
    }
    sessionStorage.setItem(PRINT_KEY, JSON.stringify(config))
    nav('/print')
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">🖨️ PDF 派題設定</h2>

      <div className="card p-4 space-y-3">
        <label className="block">
          <span className="label">學制</span>
          <select
            value={stage}
            onChange={e => { setStage(e.target.value as Stage | 'all'); setGrade('all'); setSubjectId('all'); setChapters([]) }}
            className="input"
          >
            <option value="all">全部學制</option>
            <option value="junior">{STAGE_LABELS.junior}</option>
            <option value="senior">{STAGE_LABELS.senior}</option>
          </select>
        </label>

        {stage !== 'all' && (
          <label className="block">
            <span className="label">年級</span>
            <select
              value={grade}
              onChange={e => { setGrade(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10) as Grade); setSubjectId('all'); setChapters([]) }}
              className="input"
            >
              <option value="all">全部年級</option>
              {STAGE_GRADES[stage].map(g => (
                <option key={g} value={g}>{GRADE_LABELS[g]}</option>
              ))}
            </select>
          </label>
        )}

        {grade !== 'all' && stage !== 'all' && (
          <label className="block">
            <span className="label">科目</span>
            <select
              value={subjectId}
              onChange={e => { setSubjectId(e.target.value); setChapters([]) }}
              className="input"
            >
              <option value="all">全部科目</option>
              {Array.from(new Set(notes.filter(n => n.stage === stage && n.grade === grade).map(n => n.subjectId)))
                .map(sid => (
                  <option key={sid} value={sid}>{sid}</option>
                ))}
            </select>
          </label>
        )}

        {/* 章節多選 */}
        {subjectId !== 'all' && grade !== 'all' && stage !== 'all' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="label">章節（複選，不勾 = 全部）</span>
              <button type="button" onClick={() => setChapters([])} className="text-xs text-primary-600">清除</button>
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto border border-slate-200 rounded p-2">
              {getChapters(grade as Grade, subjectId).map(ch => {
                const checked = chapters.includes(ch.id)
                return (
                  <label key={ch.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 px-1 rounded">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => {
                        setChapters(prev => e.target.checked ? [...prev, ch.id] : prev.filter(c => c !== ch.id))
                      }}
                    />
                    <span>{ch.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* 題數 */}
        <div>
          <span className="label">出題數</span>
          <div className="flex gap-2 flex-wrap">
            {[5, 10, 15, 20, 0].map(n => (
              <button
                key={n}
                onClick={() => setLimit(n)}
                className={`px-3 py-1.5 rounded text-sm ${limit === n ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {n === 0 ? '全部' : `${n} 題`}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-400 mt-1">此範圍有 {available} 題可出</div>
        </div>

        {/* 出題模式 */}
        <div>
          <span className="label">出題模式</span>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('random')}
              className={`px-3 py-1.5 rounded text-sm flex-1 ${mode === 'random' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              🎲 隨機出題
            </button>
            <button
              onClick={() => setMode('hard')}
              className={`px-3 py-1.5 rounded text-sm flex-1 ${mode === 'hard' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              💪 高錯題優先
            </button>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {mode === 'random' ? '從範圍內隨機抽取' : '依錯題次數由多到少排序（錯最多次的先出）'}
          </div>
        </div>

        {/* 版本 */}
        <div>
          <span className="label">版本</span>
          <div className="flex gap-2">
            <button
              onClick={() => setVersion('student')}
              className={`px-3 py-1.5 rounded text-sm flex-1 ${version === 'student' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              📝 派題本（學生）
            </button>
            <button
              onClick={() => setVersion('answer')}
              className={`px-3 py-1.5 rounded text-sm flex-1 ${version === 'answer' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              📖 解答本（家長）
            </button>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {version === 'student' ? '只有題目，詳解放最後一頁當解答' : '每題附完整詳解'}
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={available === 0}
          className="btn-primary w-full disabled:opacity-40"
        >
          🖨️ 產生 PDF（{available > 0 ? Math.min(limit || available, available) : 0} 題）
        </button>
      </div>
    </div>
  )
}
