import { useRef, useState } from 'react'
import { compressImage, approxDataUrlSize } from '../utils/image'
import { renderLatex } from '../utils/math'

const SYMBOL_GROUPS: { label: string; symbols: string[] }[] = [
  {
    label: '基礎',
    symbols: ['+', '−', '×', '÷', '·', '=', '(', ')', '[', ']', '<', '>', '≤', '≥', '≠', '≈', '±'],
  },
  {
    label: '冪次根號',
    symbols: ['√', '∛', '²', '³', 'ⁿ', '¹', '⁰', '⁻¹'],
  },
  {
    label: '希臘/常用',
    symbols: ['π', 'θ', 'α', 'β', 'γ', 'λ', 'ω', 'Δ', '∞', '°', '%'],
  },
  {
    label: '微積分/集合',
    symbols: ['∑', '∏', '∫', '∂', '∇', '∮', 'lim', 'log', 'ln', '∈', '⊂', '∪', '∩', '∅'],
  },
  {
    label: '邏輯/箭頭',
    symbols: ['→', '←', '↔', '⇒', '⇐', '∴', '∵', '∀', '∃'],
  },
  {
    label: '其他',
    symbols: ['sin', 'cos', 'tan', 'x²', 'y²', 'a/b', '1/2', '3/4'],
  },
]

const LATEX_TEMPLATES: { label: string; insert: string; desc: string }[] = [
  { label: '分數 a/b', insert: '\\frac{a}{b}', desc: '插入後 a 自動反白可直接覆蓋' },
  { label: '指數 x^n', insert: 'x^{n}', desc: '插入後 n 自動反白' },
  { label: '下標 x_n', insert: 'x_{n}', desc: '插入後 n 自動反白' },
  { label: '根號 √x', insert: '\\sqrt{x}', desc: '插入後 x 自動反白' },
  { label: '立方根 ∛', insert: '\\sqrt[3]{x}', desc: '插入後 x 自動反白' },
  { label: 'x^{x+1}', insert: 'x^{x+1}', desc: '複合指數' },
  { label: '對數 log', insert: '\\log_{a}{b}', desc: '插入後 a 自動反白' },
  { label: '極限 lim', insert: '\\lim_{x \\to \\infty}', desc: '極限' },
]

interface Props {
  value: string
  onChange: (v: string) => void
  images: string[]
  onImagesChange: (imgs: string[]) => void
  placeholder?: string
  rows?: number
}

type Mode = 'symbols' | 'latex'

export default function StudentAnswerInput({
  value, onChange, images, onImagesChange, placeholder, rows = 5,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [compressing, setCompressing] = useState(false)
  const [mode, setMode] = useState<Mode>('latex')

  function insertAtCursor(text: string) {
    const ta = taRef.current
    if (!ta) { onChange(value + text); return }
    const start = ta.selectionStart ?? value.length
    const end = ta.selectionEnd ?? value.length
    const before = value.slice(0, start)
    const after = value.slice(end)
    const next = before + text + after
    onChange(next)

    // 找第一個 {xxx} 的內容，反白讓學生直接覆蓋（編輯器標準體驗）
    // 沒找到就把游標放在最後
    const m = text.match(/\{([^{}]+)\}/)
    requestAnimationFrame(() => {
      ta.focus()
      if (m && m.index !== undefined) {
        const selStart = start + m.index + 1  // { 後
        const selEnd = selStart + m[1].length
        ta.setSelectionRange(selStart, selEnd)
      } else {
        const pos = start + text.length
        ta.setSelectionRange(pos, pos)
      }
    })
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCompressing(true)
    try {
      const dataUrl = await compressImage(file)
      const kb = (approxDataUrlSize(dataUrl) / 1024).toFixed(0)
      console.info(`[sqa] 作答圖壓縮完成：${kb} KB`)
      onImagesChange([...images, dataUrl])
    } catch (err) {
      console.error('壓縮失敗', err)
    } finally {
      setCompressing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removeImage(i: number) {
    onImagesChange(images.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-3">
      {/* 模式切換 */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode('latex')}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${mode === 'latex' ? 'bg-white shadow-sm text-primary-600 font-medium' : 'text-slate-500'}`}
        >
          ✏️ LaTeX 輸入
        </button>
        <button
          type="button"
          onClick={() => setMode('symbols')}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${mode === 'symbols' ? 'bg-white shadow-sm text-primary-600 font-medium' : 'text-slate-500'}`}
        >
          🔣 符號工具列
        </button>
      </div>

      {/* LaTeX 模板（只在 LaTeX 模式顯示） */}
      {mode === 'latex' && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-slate-400 w-14 shrink-0">模板</span>
            {LATEX_TEMPLATES.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => insertAtCursor(t.insert)}
                title={t.desc}
                className="min-w-[34px] h-8 px-1.5 bg-white border border-slate-200 rounded-md text-xs hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer hover:text-slate-700">📖 LaTeX 速查</summary>
            <div className="mt-2 p-3 bg-slate-50 rounded-lg space-y-1 font-mono text-[11px]">
              <div><b>\frac{'{a}'}{'{b}'}</b> → 分數 a/b</div>
              <div><b>x^{'{n}'}</b> → 上標（必須用大括號包）</div>
              <div><b>x_{'{n}'}</b> → 下標</div>
              <div><b>\sqrt{'{x}'}</b> → 根號 √x</div>
              <div><b>\sqrt[n]{'{x}'}</b> → n次根號</div>
              <div><b>x^{'{x+1}'}</b> → 複合指數</div>
              <div><b>\log_{'{a}'}{'{b}'}</b> → 對數</div>
              <div><b>\lim_{'{x \\to \\infty}'}</b> → 極限</div>
              <div><b>\alpha \beta \pi \theta</b> → 希臘字母 α β π θ</div>
              <div><b>\times \div \le \ge \neq</b> → 運算子 × ÷ ≤ ≥ ≠</div>
              <div><b>\sum \int \infty</b> → 大運算子 ∑ ∫ ∞</div>
              <div><b>\to \Rightarrow</b> → 箭頭 → ⇒</div>
              <div className="text-slate-400 pt-1">※ 點模板按鈕會插入範例，第一個 {'{xxx}'} 內容自動反白可直接覆蓋</div>
            </div>
          </details>
        </div>
      )}

      {/* 符號工具列（只在 symbols 模式顯示） */}
      {mode === 'symbols' && (
        <div className="space-y-1.5">
          {SYMBOL_GROUPS.map(group => (
            <div key={group.label} className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-slate-400 w-14 shrink-0">{group.label}</span>
              {group.symbols.map((s, i) => (
                <button
                  key={`${group.label}-${i}`}
                  type="button"
                  onClick={() => insertAtCursor(s)}
                  className="min-w-[34px] h-8 px-1.5 bg-white border border-slate-200 rounded-md text-sm hover:bg-slate-50 active:bg-slate-100 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* 文字輸入 */}
      <textarea
        ref={taRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="input resize-none font-mono text-sm"
        placeholder={
          mode === 'latex'
            ? '用 LaTeX 輸入，例如 \\frac{a}{b}、\\sqrt{2}、x^{x+1}、\\alpha\\pi r^2'
            : placeholder ?? '寫下你的想法、步驟、答案…'
        }
      />

      {/* LaTeX 即時預覽（只在 LaTeX 模式顯示） */}
      {mode === 'latex' && value.trim() && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <div className="text-[10px] font-semibold text-slate-500 mb-1.5">👀 即時預覽</div>
          <div
            className="math text-slate-800"
            dangerouslySetInnerHTML={{ __html: renderLatex(value) }}
          />
        </div>
      )}

      {/* 拍照補充 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={compressing}
          className="btn-secondary text-sm py-2"
        >
          {compressing ? '處理中…' : '📷 附加作答照片'}
        </button>
        <span className="text-xs text-slate-500">手寫 / 計算紙拍下來附加</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          className="hidden"
        />
      </div>

      {/* 已附加的照片縮圖 */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img
                src={img}
                alt={`作答圖 ${i + 1}`}
                className="rounded-lg w-full aspect-square object-cover bg-slate-100 border border-slate-200"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                aria-label="移除"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
