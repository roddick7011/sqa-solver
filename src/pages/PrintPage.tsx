import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db/db'
import { getChapters, getSubject, GRADE_LABELS, STAGE_LABELS } from '../data/curriculum'
import type { WrongNote } from '../types'
import { useProfile } from '../contexts/ProfileContext'
import { PRINT_KEY, type PrintConfig } from './PrintSetupPage'

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function chapterName(note: WrongNote): string {
  if (!note.chapterId) return ''
  try {
    const ch = getChapters(note.grade, note.subjectId).find(c => c.id === note.chapterId)
    return ch?.name ?? ''
  } catch { return '' }
}

export default function PrintPage() {
  const { current } = useProfile()
  const [config, setConfig] = useState<PrintConfig | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem(PRINT_KEY)
    if (raw) {
      try { setConfig(JSON.parse(raw)) } catch { /* ignore */ }
    }
  }, [])

  const [loadedNotes, setLoadedNotes] = useState<WrongNote[]>([])
  useEffect(() => {
    if (!current) return
    db.notes.where('profileId').equals(current.id).toArray().then(setLoadedNotes)
  }, [current])

  // 篩選 + 排序
  const questions = useMemo(() => {
    if (!config) return []
    let result = loadedNotes.filter(n => {
      if (config.stage !== 'all' && n.stage !== config.stage) return false
      if (config.grade !== 'all' && n.grade !== config.grade) return false
      if (config.subjectId !== 'all' && n.subjectId !== config.subjectId) return false
      if (config.chapters.length > 0 && (!n.chapterId || !config.chapters.includes(n.chapterId))) return false
      return true
    })
    // 排序：隨機 or 高錯題優先
    if (config.mode === 'random') {
      result = shuffle(result)
    } else {
      result = [...result].sort((a, b) => {
        const errA = (a.reviewCount ?? 0) + (a.lastResult === 'wrong' ? 1000 : 0)
        const errB = (b.reviewCount ?? 0) + (b.lastResult === 'wrong' ? 1000 : 0)
        return errB - errA
      })
    }
    if (config.limit > 0) result = result.slice(0, config.limit)
    return result
  }, [config, loadedNotes])

  useEffect(() => {
    if (config && questions.length > 0) {
      // 等畫面渲染後再列印
      const t = setTimeout(() => window.print(), 500)
      return () => clearTimeout(t)
    }
  }, [config, questions.length])

  if (!config) {
    return (
      <div className="p-6 text-center">
        <div className="text-lg font-semibold mb-2">沒有派題設定</div>
        <Link to="/print-setup" className="btn-primary inline-block">去設定</Link>
      </div>
    )
  }

  const title = `${config.stage !== 'all' ? STAGE_LABELS[config.stage] : '全部'} · ${config.grade !== 'all' ? GRADE_LABELS[config.grade] : '全部'} · ${config.subjectId !== 'all' ? config.subjectId : '全部'}`

  return (
    <div>
      {/* 工具列（列印時隱藏） */}
      <div className="no-print sticky top-0 z-10 bg-white border-b p-3 flex items-center gap-3 print:hidden">
        <Link to="/print-setup" className="btn-secondary text-sm">← 回設定</Link>
        <div className="text-sm text-slate-600 flex-1 truncate">{title}</div>
        <button onClick={() => window.print()} className="btn-primary text-sm">🖨️ 列印 / 存 PDF</button>
      </div>

      {/* 列印內容 */}
      <div className="print-content max-w-[210mm] mx-auto p-4 print:p-0">
        <div className="text-center mb-4 print:mb-6">
          <h1 className="text-xl font-bold">錯題派題練習</h1>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="text-sm text-slate-500">共 {questions.length} 題 · {new Date().toLocaleDateString('zh-TW')}</div>
        </div>

        {questions.map((n, idx) => {
          const sub = getSubject(n.stage, n.grade, n.subjectId)
          const chName = chapterName(n)
          return (
            <div key={n.id} className="print-question mb-5 break-inside-avoid">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-bold">{idx + 1}.</span>
                <span className="text-xs text-slate-500">
                  {sub?.emoji} {sub?.name} {chName ? `· ${chName}` : ''}
                </span>
              </div>
              {/* 題目文字 */}
              <div className="question-text whitespace-pre-wrap text-[15px] leading-relaxed mb-2">
                {n.questionText || '(無題目文字)'}
              </div>
              {/* 題目圖片（若有） */}
              {n.questionImage && (
                <img
                  src={n.questionImage}
                  alt="題目"
                  className="max-h-56 max-w-full object-contain my-2 border border-slate-300 rounded"
                />
              )}

              {config.version === 'answer' ? (
                /* 解答本：附詳解 */
                <div className="solution-text text-[13px] text-slate-800 leading-relaxed mt-2 pt-2 border-t border-dashed border-slate-300">
                  <div className="font-semibold text-slate-600 mb-1">【詳解】</div>
                  {n.aiSolution || '(無詳解)'}
                </div>
              ) : (
                /* 派題本：留作答區 */
                <div className="answer-area mt-2 border-t border-dashed border-slate-300">
                  <div className="text-xs text-slate-400 mt-1">作答區</div>
                  <div className="h-24"></div>
                </div>
              )}
            </div>
          )
        })}

        {/* 派題本：解答放最後一頁 */}
        {config.version === 'student' && (
          <div className="print-break-before">
            <h2 className="text-lg font-bold mb-3">📖 解答</h2>
            {questions.map((n, idx) => (
              <div key={n.id} className="mb-4 break-inside-avoid">
                <div className="font-bold mb-1">{idx + 1}.</div>
                <div className="question-text whitespace-pre-wrap text-[14px] mb-1">{n.questionText || '(無題目文字)'}</div>
                {n.questionImage && (
                  <img src={n.questionImage} alt="題目" className="max-h-40 max-w-full object-contain my-1" />
                )}
                <div className="solution-text text-[13px] leading-relaxed">
                  {n.aiSolution || '(無詳解)'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 列印專用 CSS */}
      <style>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-content { padding: 0 !important; max-width: 100% !important; }
          .print-question { page-break-inside: avoid; }
          .print-break-before { page-break-before: always; }
          .answer-area { height: auto; }
          .answer-area > div:last-child { height: 20mm; }
          .question-text, .solution-text { font-size: 14px; line-height: 1.6; }
          img { max-height: 50mm !important; }
        }
        @page { size: A4; margin: 15mm; }
      `}</style>
    </div>
  )
}
