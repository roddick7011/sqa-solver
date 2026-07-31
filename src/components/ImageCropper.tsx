import { useEffect, useRef, useState } from 'react'
import { approxDataUrlSize } from '../utils/image'

interface Props {
  image: string
  onConfirm: (croppedDataUrl: string) => void
  onCancel: () => void
  onUseOriginal: () => void
}

type Handle =
  | 'tl' | 'tr' | 'bl' | 'br'
  | 't' | 'b' | 'l' | 'r'
  | 'move'

interface Sel { x: number; y: number; w: number; h: number }

const MIN_SIZE = 30  // 圖片自然像素

export default function ImageCropper({ image, onConfirm, onCancel, onUseOriginal }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)            // 使用者額外縮放（1 = 適配）
  const [sel, setSel] = useState<Sel>({ x: 0, y: 0, w: 0, h: 0 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dragRef = useRef<{
    handle: Handle
    startX: number
    startY: number
    startSel: Sel
  } | null>(null)

  // 載入圖片 → 預設選取 80% 中央
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      setNaturalSize({ w, h })
      setSel({ x: w * 0.1, y: h * 0.1, w: w * 0.8, h: h * 0.8 })
    }
    img.src = image
  }, [image])

  // 圖片在容器中的顯示尺寸（object-fit: contain）
  function getDisplay() {
    if (!wrapRef.current || !naturalSize.w) {
      return { offsetX: 0, offsetY: 0, dispW: 0, dispH: 0, scale: 1 }
    }
    const cw = wrapRef.current.clientWidth
    const ch = wrapRef.current.clientHeight
    const baseScale = Math.min(cw / naturalSize.w, ch / naturalSize.h)
    const s = baseScale * zoom
    const dispW = naturalSize.w * s
    const dispH = naturalSize.h * s
    return {
      offsetX: (cw - dispW) / 2,
      offsetY: (ch - dispH) / 2,
      dispW,
      dispH,
      scale: s,
    }
  }

  function onPointerDown(handle: Handle, e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startSel: { ...sel },
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const { scale } = getDisplay()
    if (scale <= 0) return
    const dx = (e.clientX - dragRef.current.startX) / scale
    const dy = (e.clientY - dragRef.current.startY) / scale
    const start = dragRef.current.startSel
    const next: Sel = { ...start }
    const h = dragRef.current.handle

    if (h === 'move') {
      next.x = clamp(start.x + dx, 0, naturalSize.w - start.w)
      next.y = clamp(start.y + dy, 0, naturalSize.h - start.h)
    } else {
      // 左邊
      if (h === 'tl' || h === 'l' || h === 'bl') {
        const newX = clamp(start.x + dx, 0, start.x + start.w - MIN_SIZE)
        next.w = start.x + start.w - newX
        next.x = newX
      }
      // 右邊
      if (h === 'tr' || h === 'r' || h === 'br') {
        next.w = clamp(start.w + dx, MIN_SIZE, naturalSize.w - start.x)
      }
      // 上邊
      if (h === 'tl' || h === 't' || h === 'tr') {
        const newY = clamp(start.y + dy, 0, start.y + start.h - MIN_SIZE)
        next.h = start.y + start.h - newY
        next.y = newY
      }
      // 下邊
      if (h === 'bl' || h === 'b' || h === 'br') {
        next.h = clamp(start.h + dy, MIN_SIZE, naturalSize.h - start.y)
      }
    }
    setSel(next)
  }

  function onPointerUp(e: React.PointerEvent) {
    dragRef.current = null
    try { (e.target as Element).releasePointerCapture(e.pointerId) } catch {}
  }

  function reset() {
    if (!naturalSize.w) return
    setSel({ x: naturalSize.w * 0.1, y: naturalSize.h * 0.1, w: naturalSize.w * 0.8, h: naturalSize.h * 0.8 })
    setZoom(1)
  }

  async function confirm() {
    if (sel.w < 1 || sel.h < 1) return
    setBusy(true)
    setError('')
    try {
      const cropped = await getCroppedImg(image, sel)
      const kb = (approxDataUrlSize(cropped) / 1024).toFixed(0)
      console.info(`[sqa] 裁切完成：${kb} KB`)
      onConfirm(cropped)
    } catch (e: any) {
      setError(`裁切失敗：${e?.message ?? e}`)
    } finally {
      setBusy(false)
    }
  }

  const { offsetX, offsetY, dispW, dispH, scale } = getDisplay()

  // 螢幕座標 = 圖片座標 × scale + offset
  const boxLeft = offsetX + sel.x * scale
  const boxTop = offsetY + sel.y * scale
  const boxW = sel.w * scale
  const boxH = sel.h * scale
  const naturalW = naturalSize.w
  const naturalH = naturalSize.h
  const selRatio = naturalW > 0 && naturalH > 0
    ? `${(sel.w / naturalW * 100).toFixed(0)}% × ${(sel.h / naturalH * 100).toFixed(0)}%`
    : ''

  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-600 leading-relaxed">
        ✂️ <b>雙軸自由比例</b>：拖移四角 / 四邊改大小，框內拖移移動位置。
        如果想用整張就按「使用原圖」。
      </div>

      <div
        ref={wrapRef}
        className="relative w-full bg-slate-900 rounded-xl overflow-hidden touch-none"
        style={{ height: '60vh', maxHeight: 480 }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* 圖片（不可拖拉，純顯示） */}
        {naturalW > 0 && (
          <img
            src={image}
            alt=""
            draggable={false}
            className="absolute select-none pointer-events-none"
            style={{
              left: offsetX,
              top: offsetY,
              width: dispW,
              height: dispH,
            }}
          />
        )}

        {/* 暗化遮罩（用 box-shadow 蓋在外面） */}
        {naturalW > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: boxLeft,
              top: boxTop,
              width: boxW,
              height: boxH,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              border: '2px solid white',
            }}
          />
        )}

        {/* 8 個拖拉 handle + 中央 move */}
        {naturalW > 0 && (
          <>
            {/* 四角 */}
            <Handle x={boxLeft - 10} y={boxTop - 10} onPointerDown={e => onPointerDown('tl', e)} cursor="nwse-resize" />
            <Handle x={boxLeft + boxW - 10} y={boxTop - 10} onPointerDown={e => onPointerDown('tr', e)} cursor="nesw-resize" />
            <Handle x={boxLeft - 10} y={boxTop + boxH - 10} onPointerDown={e => onPointerDown('bl', e)} cursor="nesw-resize" />
            <Handle x={boxLeft + boxW - 10} y={boxTop + boxH - 10} onPointerDown={e => onPointerDown('br', e)} cursor="nwse-resize" />
            {/* 四邊中點 */}
            <Handle x={boxLeft + boxW / 2 - 10} y={boxTop - 6} onPointerDown={e => onPointerDown('t', e)} cursor="ns-resize" small />
            <Handle x={boxLeft + boxW / 2 - 10} y={boxTop + boxH - 6} onPointerDown={e => onPointerDown('b', e)} cursor="ns-resize" small />
            <Handle x={boxLeft - 6} y={boxTop + boxH / 2 - 10} onPointerDown={e => onPointerDown('l', e)} cursor="ew-resize" small />
            <Handle x={boxLeft + boxW - 6} y={boxTop + boxH / 2 - 10} onPointerDown={e => onPointerDown('r', e)} cursor="ew-resize" small />
            {/* 中央 move */}
            <div
              className="absolute"
              style={{
                left: boxLeft,
                top: boxTop,
                width: boxW,
                height: boxH,
                cursor: 'move',
              }}
              onPointerDown={e => onPointerDown('move', e)}
            />
          </>
        )}

        {/* 框選資訊（寬 × 高 in % of 原圖） */}
        {naturalW > 0 && (
          <div
            className="absolute text-[10px] text-white bg-black/60 rounded px-1.5 py-0.5 pointer-events-none"
            style={{ left: boxLeft + 4, top: boxTop + 4 }}
          >
            {selRatio}
          </div>
        )}
      </div>

      {/* 縮放控制（雙軸都能放大看得更清楚再框選） */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 shrink-0">放大</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={e => setZoom(parseFloat(e.target.value))}
          className="flex-1"
        />
        <span className="text-xs text-slate-500 w-10 text-right">{zoom.toFixed(2)}×</span>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm p-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="btn-secondary text-sm py-2">取消</button>
        <button onClick={reset} className="btn-secondary text-sm py-2">↺ 重置</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onUseOriginal} className="btn-secondary text-sm py-2">使用原圖</button>
        <button onClick={confirm} disabled={busy} className="btn-primary text-sm py-2">
          {busy ? '處理中…' : '✓ 使用裁切'}
        </button>
      </div>
    </div>
  )
}

function Handle({
  x, y, onPointerDown, cursor, small,
}: {
  x: number; y: number
  onPointerDown: (e: React.PointerEvent) => void
  cursor: string
  small?: boolean
}) {
  const size = small ? 12 : 20
  return (
    <div
      className="absolute bg-white border-2 border-primary-600 rounded-full touch-none"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        cursor,
      }}
      onPointerDown={onPointerDown}
    />
  )
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

async function getCroppedImg(src: string, sel: Sel): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sel.w))
  canvas.height = Math.max(1, Math.round(sel.h))
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    image,
    sel.x, sel.y, sel.w, sel.h,
    0, 0, canvas.width, canvas.height,
  )

  return canvas.toDataURL('image/jpeg', 0.9)
}
