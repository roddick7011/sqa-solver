import { Link, useParams } from 'react-router-dom'
import { GRADE_LABELS, getSubjects } from '../data/curriculum'
import type { Grade, Stage } from '../types'

const COLOR_BG: Record<string, string> = {
  rose: 'bg-rose-100',
  sky: 'bg-sky-100',
  indigo: 'bg-indigo-100',
  emerald: 'bg-emerald-100',
  amber: 'bg-amber-100',
  pink: 'bg-pink-100',
  cyan: 'bg-cyan-100',
  lime: 'bg-lime-100',
  teal: 'bg-teal-100',
  orange: 'bg-orange-100',
  yellow: 'bg-yellow-100',
  violet: 'bg-violet-100',
  fuchsia: 'bg-fuchsia-100',
  blue: 'bg-blue-100',
}

export default function SubjectPage() {
  const { stage, grade } = useParams<{ stage: string; grade: string }>()
  const s = stage as Stage
  const g = parseInt(grade ?? '7', 10) as Grade
  const subjects = getSubjects(s, g)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{GRADE_LABELS[g]}・選科目</h2>
        <p className="text-sm text-slate-500">點選科目開始新增錯題</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {subjects.map(sub => (
          <Link
            key={sub.id}
            to={`/stage/${s}/grade/${g}/subject/${sub.id}/chapter`}
            className="card aspect-square flex flex-col items-center justify-center p-2 active:scale-95 transition-transform"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${COLOR_BG[sub.color] ?? 'bg-slate-100'}`}>
              {sub.emoji}
            </div>
            <span className="text-sm font-medium mt-2 text-center leading-tight">{sub.name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
