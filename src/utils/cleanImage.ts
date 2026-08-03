// 移除紅筆/藍筆/螢光筆標記（canvas 像素過濾）
// 將紅/藍/螢光色像素替換為白色

interface HSVRange { hueMin: number; hueMax: number; satMin: number; valMin: number }

// 定義要移除的顏色範圍（HSV）
const MARK_RANGES: HSVRange[] = [
  { hueMin: 0, hueMax: 15, satMin: 0.3, valMin: 0.2 },   // 紅色系（0°-15°）
  { hueMin: 340, hueMax: 360, satMin: 0.3, valMin: 0.2 }, // 紅色系（340°-360°）
  { hueMin: 180, hueMax: 260, satMin: 0.3, valMin: 0.2 }, // 藍色系
  { hueMin: 40, hueMax: 70, satMin: 0.3, valMin: 0.5 },   // 螢光黃/綠（高亮度）
  { hueMin: 20, hueMax: 40, satMin: 0.3, valMin: 0.6 },   // 螢光橘/桃紅
]

// RGB → HSV
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [h * 360, s, v]
}

// 判斷像素是否為筆跡顏色
function isMarkColor(r: number, g: number, b: number): boolean {
  const [h, s, v] = rgbToHsv(r, g, b)
  return MARK_RANGES.some(range =>
    ((h >= range.hueMin && h <= range.hueMax) ||
     (range.hueMin > range.hueMax && (h >= range.hueMin || h <= range.hueMax))) &&
    s >= range.satMin && v >= range.valMin
  )
}

// 清除標記：回傳新的 dataURL
export function cleanMarks(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const pixels = imageData.data
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
        if (isMarkColor(r, g, b)) {
          pixels[i] = 255     // R → 白
          pixels[i + 1] = 255 // G → 白
          pixels[i + 2] = 255 // B → 白
          // alpha 保持
        }
      }
      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => reject(new Error('圖片載入失敗'))
    img.src = dataUrl
  })
}
