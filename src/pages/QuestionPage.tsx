import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GRADE_LABELS, getSubject, STAGE_LABELS } from '../data/curriculum'
import type { Grade, Stage } from '../types'
import { loadAIConfig, makeSolver } from '../ai/solver'
import { approxDataUrlSize, compressImage } from '../utils/image'
import { formatAnswer } from '../utils/format'
import ImageCropper from '../components/ImageCropper'
import { useAuth } from '../contexts/AuthContext'
import { cleanDocument, type CleanResult, type FadeParams } from '../utils/cleanImage'
import CategorizeModal, { type Category } from '../components/CategorizeModal'

const DRAFT_KEY = 'sqa:pending-solution'

export default function QuestionPage() {
  const { stage, grade, subjectId } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  // 自由模式：沒有帶分類參數（首頁「⚡ AI 解題」進來），解完再分類
  const isFree = !stage || !grade || !subjectId
  const s = stage as Stage | undefined
  const g = grade ? parseInt(grade, 10) as Grade : undefined
  const sub = (s && g && subjectId) ? getSubject(s, g, subjectId) : undefined
  // 章節（從 query string 讀取）
  const qs = new URLSearchParams(window.location.search)
  const chapterId = qs.get('chapterId') ?? undefined
  const chapterName = qs.get('chapterName') ?? undefined
  const [showCategorize, setShowCategorize] = useState(false) // 🆕 自由模式分類 modal

  const [text, setText] = useState('')
  const [image, setImage] = useState<string | undefined>()
  const [pendingCrop, setPendingCrop] = useState<string | undefined>()
  const [solution, setSolution] = useState<string>('')
  const [aiCues, setAiCues] = useState<string>('')
  const [aiSummary, setAiSummary] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)
  const cleanedImageRef = useRef<string | undefined>() // 🆕 清理後的圖片
  const abortRef = useRef<AbortController | null>(null)

  const [compressing, setCompressing] = useState(false)
  const [ignoreMarks, setIgnoreMarks] = useState(false) // 🆕 忽略手寫標記
  const [cleanedQuestion, setCleanedQuestion] = useState('') // 🆕 AI 謄寫的乾淨題目
  const [cleanedImage, setCleanedImage] = useState<string | undefined>() // 清理後的圖片（永遠存入錯題本） // 🆕 清理後的圖片（state，非 ref）
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null) // 🆕 清理結果
  const [fadeParams, setFadeParams] = useState<FadeParams>({
    redFade: 70, blueFade: 70, sensitivity: 50, blackProtect: 80, bgClean: 50
  }) // 🆕 slider 參數
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // 即時預覽：slider 變更後 100ms debounce 重新清理
  function onFadeChange(key: keyof FadeParams, value: number) {
    const next = { ...fadeParams, [key]: value }
    setFadeParams(next)
    if (!image) return
    clearTimeout(fadeTimerRef.current)
    fadeTimerRef.current = setTimeout(async () => {
      try {
        const result = await cleanDocument(image!, next)
        setCleanResult(result)
        setCleanedImage(result.afterUrl)
      } catch {}
    }, 100)
  }
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCompressing(true)
    setError('')
    try {
      const dataUrl = await compressImage(file)
      const kb = (approxDataUrlSize(dataUrl) / 1024).toFixed(0)
      console.info(`[sqa] 圖片壓縮完成：${kb} KB`)
      // 進入裁切畫面，使用者可在這裡框選要解題的範圍
      setPendingCrop(dataUrl)
    } catch (err: any) {
      setError(`圖片處理失敗：${err?.message ?? err}`)
    } finally {
      setCompressing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onSolve() {
    if (!text.trim() && !image) {
      setError('請至少輸入文字題目或拍照')
      return
    }
    setError('')
    setLoading(true)
    setSolution('')
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const cfg = loadAIConfig()
      const solver = makeSolver(cfg)
      const validation = solver.validateConfig()
      if (validation) {
        setError(`${validation}（請到「設定」填入）`)
        setLoading(false)
        return
      }

      // 🆕 M3 偵測 + 清理標記後再送 AI
      let solveImage: string | undefined = image
      if (ignoreMarks && image) {
        setError('🖌️ 清除筆跡中…')
        try {
          const result = await cleanDocument(image, fadeParams)
          solveImage = result.afterUrl
          setCleanedImage(result.afterUrl)
          setCleanResult(result)
        } catch { setCleanedImage(undefined) }
        setError('')
      }

      const result = await solver.solve(
        {
          questionText: text,
          questionImage: solveImage,
          subjectName: sub?.name ?? '一般題目',
          gradeLabel: s && g ? `${STAGE_LABELS[s]}・${GRADE_LABELS[g]}` : '不分年級',
          ignoreMarks,  // 🆕
        },
        abortRef.current.signal,
      )
      setSolution(result.solution)
      setAiCues(result.cues ?? '')
      setAiSummary(result.summary ?? '')
      // 🆕 用 AI 謄寫的乾淨題目取代（如果 AI 有回傳）
      if (result.question_clean) {
        setText(result.question_clean)
        setCleanedQuestion(result.question_clean)
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setError(e?.message ?? '解題失敗，請檢查 API 設定或網路')
    } finally {
      setLoading(false)
    }
  }

  function onCancel() {
    abortRef.current?.abort()
    setLoading(false)
  }

  function onSaveNote() {
    if (!solution) return
    // 自由模式：先彈分類 modal，選完再存
    if (isFree || !s || !g || !sub) {
      setShowCategorize(true)
      return
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
      stage: s, grade: g, subjectId: sub.id,
      chapterId,
      // 🆕 淡化後的圖片永遠存入（供未來 PDF / 複習用）
      // 純文字題也有圖（等同掃描檔），以後不需要回頭找原圖
      questionText: cleanedQuestion || text,
      questionImage: cleanedImage || image || undefined,
      aiSolution: solution,
      aiCues,
      aiSummary,
    }))
    nav(`/stage/${s}/grade/${g}/subject/${sub.id}/note/new`)
  }

  // 🆕 自由模式：分類完成後存草稿並進筆記頁
  function onCategorizeConfirm(cat: Category) {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
      stage: cat.stage, grade: cat.grade, subjectId: cat.subjectId,
      chapterId: cat.chapterId,
      questionText: cleanedQuestion || text,
      questionImage: cleanedImage || image || undefined,
      aiSolution: solution,
      aiCues,
      aiSummary,
    }))
    setShowCategorize(false)
    nav(`/stage/${cat.stage}/grade/${cat.grade}/subject/${cat.subjectId}/note/new`)
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-xl">
          {sub ? sub.emoji : '⚡'}
        </div>
        <div>
          <div className="font-semibold">{sub ? sub.name : '自由解題'}</div>
          <div className="text-xs text-slate-500">
            {s && g && sub ? `${STAGE_LABELS[s]}・${GRADE_LABELS[g]}` : '不需先選學制年級，解完再分類'}
          </div>
        </div>
      </div>

      {!user && (
        <div className="card p-3 text-xs text-slate-600 bg-amber-50 border-amber-200">
          💡 登入後可同步錯題到雲端（多裝置共享）。沒登入也能用 AI 解題。
        </div>
      )}
      <div className="card p-4 space-y-3">
        <label className="label">📷 拍題目（選填）</label>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          className="hidden"
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          onChange={onFile}
          className="hidden"
        />
        {pendingCrop ? (
          <ImageCropper
            image={pendingCrop}
            onCancel={() => setPendingCrop(undefined)}
            onUseOriginal={() => { setImage(pendingCrop); setPendingCrop(undefined) }}
            onConfirm={(cropped) => { setImage(cropped); setPendingCrop(undefined) }}
          />
        ) : image ? (
          <div className="space-y-2">
            <div className="relative">
              <img src={image} alt="題目" className="rounded-xl w-full max-h-80 object-contain bg-slate-100" />
              <button
                onClick={() => setImage(undefined)}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center"
                aria-label="移除圖片"
              >
                ✕
              </button>
            </div>
            {/* 🆕 忽略手寫標記 checkbox */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={ignoreMarks}
                onChange={e => setIgnoreMarks(e.target.checked)}
              />
              <span>題目���紅筆/藍筆/螢光筆標記，幫我忽略</span>
            </label>
            <button
              onClick={() => setPendingCrop(image)}
              className="btn-secondary w-full text-sm"
            >
              ✂️ 重新框選
            </button>
          </div>
        ) : compressing ? (
          <div className="card p-4 text-center text-sm text-slate-500">
            <span className="inline-block w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-2" />
            處理圖片中…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => cameraRef.current?.click()}
                className="btn-secondary flex flex-col items-center gap-1 py-4"
              >
                <span className="text-2xl">📷</span>
                <span className="text-sm font-medium">拍照</span>
              </button>
              <button
                onClick={() => galleryRef.current?.click()}
                className="btn-secondary flex flex-col items-center gap-1 py-4"
              >
                <span className="text-2xl">🖼️</span>
                <span className="text-sm font-medium">從相簿選</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 text-center">
              💡 手機用「拍照」直接開相機；電腦或已有照片用「從相簿選」
            </p>
          </>
        )}
      </div>

      <div className="card p-4 space-y-2">
        <label className="label">✍️ 題目內容（可搭配圖片補充）</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={5}
          className="input resize-none"
          placeholder="可以手打題目，或在圖片旁補充細節..."
        />
      </div>

      {error && (
        <div className="card p-3 border-rose-200 bg-rose-50 text-rose-700 text-sm">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <button onClick={onCancel} className="btn-secondary w-full">取消</button>
      ) : (
        <button onClick={onSolve} className="btn-primary w-full">
          🪄 AI 解題
        </button>
      )}

      {loading && (
        <div className="card p-6 text-center text-slate-500">
          <div className="text-3xl animate-pulse">🧠</div>
          <div className="mt-2 text-sm">AI 正在解題...</div>
        </div>
      )}

      {solution && !loading && (
        <>
          <div className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">✨ AI 解答</div>
              <button
                onClick={() => navigator.clipboard?.writeText(formatAnswer(solution))}
                className="btn-ghost text-xs"
              >
                📋 複製
              </button>
            </div>
            <div className="prose prose-sm prose-slate max-w-none whitespace-pre-wrap text-slate-800 leading-relaxed">
              {formatAnswer(solution)}
            </div>
          </div>

          {/* 🆕 淡化參數 + 前後預覽 */}
          {cleanResult && (
            <div className="card p-3 space-y-3">
              <div className="text-sm font-medium text-slate-600">
                🖌️ 連續淡化（用時 {cleanResult.elapsedMs}ms）
              </div>
              {/* Sliders */}
              <div className="space-y-2 text-xs">
                <SliderRow label="紅色淡化" value={fadeParams.redFade} onChange={v => onFadeChange('redFade', v)} />
                <SliderRow label="藍／紫淡化" value={fadeParams.blueFade} onChange={v => onFadeChange('blueFade', v)} />
                <SliderRow label="色彩靈敏度" value={fadeParams.sensitivity} onChange={v => onFadeChange('sensitivity', v)} />
                <details className="text-xs">
                  <summary className="cursor-pointer text-slate-500">進階設定</summary>
                  <div className="mt-2 space-y-2">
                    <SliderRow label="黑字保護" value={fadeParams.blackProtect} onChange={v => onFadeChange('blackProtect', v)} />
                    <SliderRow label="背景清理" value={fadeParams.bgClean} onChange={v => onFadeChange('bgClean', v)} />
                  </div>
                </details>
              </div>
              {/* Preview */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-slate-400 mb-1">原圖</div>
                  <img src={cleanResult.beforeUrl} alt="原始" className="rounded border border-slate-200 w-full object-contain max-h-40" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">淡化後</div>
                  <img src={cleanResult.afterUrl} alt="淡化後" className="rounded border border-slate-200 w-full object-contain max-h-40" />
                </div>
              </div>
            </div>
          )}

          <button onClick={onSaveNote} className="btn-primary w-full">
            📝 整理成康乃爾錯題筆記
          </button>
          {isFree && (
            <button onClick={() => nav('/')} className="btn-ghost w-full text-sm">
              ✅ 完成，不需要保存
            </button>
          )}
        </>
      )}

      <CategorizeModal
        open={showCategorize}
        onClose={() => setShowCategorize(false)}
        onConfirm={onCategorizeConfirm}
      />
    </div>
  )
}

// 🆕 Slider 元件
function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-slate-500">{label}</span>
      <input
        type="range"
        min="0" max="100" value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1 accent-primary-500"
      />
      <span className="w-8 text-right text-slate-400">{value}</span>
    </div>
  )
}
