import { Link, useParams } from 'react-router-dom'
import { GRADE_LABELS, STAGE_GRADES, STAGE_LABELS } from '../data/curriculum'
import type { Stage } from '../types'

export default function GradePage() {
  const { stage } = useParams<{ stage: string }>()
  const s = stage as Stage
  const grades = STAGE_GRADES[s]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{STAGE_LABELS[s]}</h2>
        <p className="text-sm text-slate-500">選擇年級</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {grades.map(g => (
          <Link
            key={g}
            to={`/stage/${s}/grade/${g}`}
            className="card aspect-square flex flex-col items-center justify-center active:scale-95 transition-transform"
          >
            <span className="text-3xl font-bold text-primary-600">{g}</span>
            <span className="text-xs text-slate-500 mt-1">{GRADE_LABELS[g].replace(/[一二三四五六七八九十]/, '')}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
