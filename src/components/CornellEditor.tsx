import { useEffect, useState } from 'react'

interface Props {
  cues: string
  notes: string
  summary: string
  onChange: (next: { cues: string; notes: string; summary: string }) => void
  readOnly?: boolean
}

export default function CornellEditor({ cues, notes, summary, onChange, readOnly }: Props) {
  const [local, setLocal] = useState({ cues, notes, summary })

  useEffect(() => {
    setLocal({ cues, notes, summary })
  }, [cues, notes, summary])

  function setField<K extends keyof typeof local>(k: K, v: string) {
    const next = { ...local, [k]: v }
    setLocal(next)
    onChange(next)
  }

  if (readOnly) {
    return (
      <div className="cornell-grid">
        <Cell title="Cues — 線索" className="area-cues bg-rose-50 border-rose-200" body={cues} />
        <Cell title="Notes — 詳解" className="area-notes bg-amber-50 border-amber-200" body={notes} />
        <Cell title="Summary — 摘要" className="area-summary bg-emerald-50 border-emerald-200" body={summary} />
      </div>
    )
  }

  return (
    <div className="cornell-grid">
      <div className="area-title text-xs text-slate-500 px-1">
        康乃爾筆記 — 三欄式
      </div>
      <Field
        title="Cues · 線索 / 關鍵字"
        tone="rose"
        value={local.cues}
        onChange={v => setField('cues', v)}
        placeholder="例如：牛頓第二定律 / 一元二次方程式 / 時態變化..."
      />
      <Field
        title="Notes · 解題詳記"
        tone="amber"
        value={local.notes}
        onChange={v => setField('notes', v)}
        placeholder="完整解題過程、步驟、概念..."
      />
      <Field
        title="Summary · 一句話反思"
        tone="emerald"
        value={local.summary}
        onChange={v => setField('summary', v)}
        placeholder="我學到了什麼？下次要注意什麼？"
      />
    </div>
  )
}

const TONE: Record<string, { bg: string; border: string; text: string }> = {
  rose:     { bg: 'bg-rose-50',     border: 'border-rose-200',     text: 'text-rose-700' },
  amber:    { bg: 'bg-amber-50',    border: 'border-amber-200',    text: 'text-amber-700' },
  emerald:  { bg: 'bg-emerald-50',  border: 'border-emerald-200',  text: 'text-emerald-700' },
}

function Field({ title, tone, value, onChange, placeholder }: {
  title: string
  tone: 'rose' | 'amber' | 'emerald'
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const t = TONE[tone]
  return (
    <div className={`area-${tone === 'rose' ? 'cues' : tone === 'amber' ? 'notes' : 'summary'} ${t.bg} border ${t.border} rounded-xl p-3`}>
      <div className={`text-xs font-semibold mb-2 ${t.text}`}>{title}</div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className="w-full bg-transparent text-sm leading-relaxed resize-none focus:outline-none placeholder:text-slate-400"
      />
    </div>
  )
}

function Cell({ title, className, body }: { title: string; className: string; body: string }) {
  return (
    <div className={`rounded-xl border p-3 ${className.replace(/^bg-\S+\s+border-\S+/, '')}`}>
      <div className="text-xs font-semibold mb-2 text-slate-700">{title}</div>
      <div className="text-sm whitespace-pre-wrap text-slate-800 leading-relaxed">{body || '（空白）'}</div>
    </div>
  )
}
