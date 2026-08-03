// 清除手寫標記（M3 偵測 + 顏色分割 + 背景填充）
import { detectMarks } from './detectMarks'
import { loadAIConfig } from '../ai/solver'

// Canvas 結果
export interface CleanResult {
  beforeUrl: string    // 原始圖片（base64）
  afterUrl: string     // 清理後圖片
  maskUrl?: string     // 🆕 mask 透明度圖（供預覽用）
  detectedCount: number
  elapsedMs: number
  originalUrl: string  // 永遠保留原圖
}

// ── HSV 顏色檢測 ──
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255, gf = g / 255, bf = b / 255
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max
  if (d !== 0) {
    if (max === rf) h = ((gf - bf) / d + (gf < bf ? 6 : 0)) / 6
    else if (max === gf) h = ((bf - rf) / d + 2) / 6
    else h = ((rf - gf) / d + 4) / 6
  }
  return [h * 360, s, v]
}

// 針對不同筆跡類型檢查
function isInkPixel(r: number, g: number, b: number, inkType: string): boolean {
  const [h, s, v] = rgbToHsv(r, g, b)

  switch (inkType) {
    case 'colored_ink':  // 紅色 / 藍色筆跡
      return ((h >= 0 && h <= 20 && s >= 0.15 && v >= 0.20) ||  // 紅色
              (h >= 340 && s >= 0.15 && v >= 0.20) ||             // 紅色尾端
              (h >= 190 && h <= 250 && s >= 0.18 && v >= 0.18))   // 藍色

    case 'highlight':    // 螢光筆（高明度）
      return ((h >= 40 && h <= 70 && s >= 0.25 && v >= 0.40) ||   // 螢光黃綠
              (h >= 15 && h <= 35 && s >= 0.25 && v >= 0.45) ||   // 螢光橘
              (h >= 0 && h <= 10 && s >= 0.20 && v >= 0.55))      // 螢光桃紅

    case 'black_pen':    // 黑筆 → 大量降低亮度
      return (v <= 0.25 && s <= 0.3)

    case 'cross_out':    // 畫叉 / 塗改
      return ((h >= 0 && h <= 15 && s >= 0.15 && v >= 0.15) ||
              (h >= 340 && s >= 0.15 && v >= 0.15) ||
              (v <= 0.22 && s <= 0.3))

    default:
      return false
  }
}

// ── 簡單的周邊顏色填充（非 OpenCV Telea，但對小區域夠用）──
// 用 mask 鄰近的非 mask 像素平均值填充
function simpleFill(pixels: Uint8ClampedArray, mask: Uint8Array, w: number, h: number) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!mask[i]) continue

      // 取 8 鄰域中非 mask 像素的平均
      let rSum = 0, gSum = 0, bSum = 0, count = 0
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const ni = ny * w + nx
          if (!mask[ni]) {
            rSum += pixels[ni * 4]
            gSum += pixels[ni * 4 + 1]
            bSum += pixels[ni * 4 + 2]
            count++
          }
        }
      }
      if (count > 0) {
        pixels[i * 4] = Math.round(rSum / count)
        pixels[i * 4 + 1] = Math.round(gSum / count)
        pixels[i * 4 + 2] = Math.round(bSum / count)
      }
    }
  }
}

// ── Bbox 正規化座標轉像素座標 ──
function normToPixel(xNorm: number, yNorm: number, w: number, h: number): [number, number] {
  return [Math.round(xNorm * w / 1000), Math.round(yNorm * h / 1000)]
}

// ��─ 主清理流程 ──
export async function cleanWithM3(dataUrl: string): Promise<CleanResult> {
  const t0 = Date.now()

  return new Promise(async (resolve, reject) => {
    const img = new Image()
    img.onload = async () => {
      const w = img.width, h = img.height
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, w, h)
      const pixels = imageData.data

      // 建立 mask（Uint8Array：每個像素 1 位元標記是否要清除）
      const mask = new Uint8Array(w * h)
      let detectedCount = 0

      // ── Phase 1：M3 偵測 ──
      let marks: any[] = []
      try {
        const cfg = loadAIConfig()
        marks = await detectMarks(dataUrl, cfg)
      } catch {
        // M3 偵測失敗 → fallback 到全圖顏色檢測
      }

      if (marks.length > 0) {
        // Phase 2：在 M3 標記的 bbox 內做顏色分割
        for (const mark of marks) {
          const [x1, y1] = normToPixel(mark.bbox.x1, mark.bbox.y1, w, h)
          const [x2, y2] = normToPixel(mark.bbox.x2, mark.bbox.y2, w, h)
          const bx1 = Math.max(0, Math.min(x1, x2))
          const by1 = Math.max(0, Math.min(y1, y2))
          const bx2 = Math.min(w, Math.max(x1, x2))
          const by2 = Math.min(h, Math.max(y1, y2))

          for (let py = by1; py < by2; py++) {
            for (let px = bx1; px < bx2; px++) {
              const i = py * w + px
              if (mask[i]) continue
              const r = pixels[i * 4], g = pixels[i * 4 + 1], b = pixels[i * 4 + 2]
              if (isInkPixel(r, g, b, mark.type)) {
                mask[i] = 1
                detectedCount++
              }
            }
          }
        }
      } else {
        // Fallback：全圖顏色檢測（比舊版範圍更精確）
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = y * w + x
            const r = pixels[i * 4], g = pixels[i * 4 + 1], b = pixels[i * 4 + 2]
            if (isInkPixel(r, g, b, 'colored_ink') ||
                isInkPixel(r, g, b, 'highlight') ||
                isInkPixel(r, g, b, 'cross_out')) {
              mask[i] = 1
              detectedCount++
            }
          }
        }
      }

      // ── Phase 3：簡單填充 ──
      if (detectedCount > 0) {
        simpleFill(pixels, mask, w, h)
      }

      ctx.putImageData(imageData, 0, 0)
      const afterUrl = canvas.toDataURL('image/jpeg', 0.88)

      // ── 產生 mask 預覽圖 ──
      let maskUrl: string | undefined
      if (detectedCount > 0) {
        const maskCanvas = document.createElement('canvas')
        maskCanvas.width = w; maskCanvas.height = h
        const mctx = maskCanvas.getContext('2d')!
        const mImageData = mctx.getImageData(0, 0, w, h)
        for (let i = 0; i < mask.length; i++) {
          if (mask[i]) {
            mImageData.data[i * 4] = 255
            mImageData.data[i * 4 + 1] = 0
            mImageData.data[i * 4 + 2] = 0
            mImageData.data[i * 4 + 3] = 128
          }
        }
        mctx.putImageData(mImageData, 0, 0)
        maskUrl = maskCanvas.toDataURL('image/png')
      }

      resolve({
        beforeUrl: dataUrl,
        afterUrl,
        maskUrl,
        detectedCount,
        elapsedMs: Date.now() - t0,
        originalUrl: dataUrl,
      })
    }
    img.onerror = () => reject(new Error('圖片載入失敗'))
    img.src = dataUrl
  })
}
