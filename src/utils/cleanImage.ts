// 移除紅筆/藍筆/螢光筆標記（canvas 像素過濾）
// 將標記顏色像素替換為白色（模擬乾淨課本/考卷）

interface HSVRange { hueMin: number; hueMax: number; satMin: number; valMin: number }

// 要移除的顏色範圍（HSV）
const MARK_RANGES: HSVRange[] = [
  { hueMin: 0, hueMax: 15, satMin: 0.2, valMin: 0.2 },   // 紅色
  { hueMin: 340, hueMax: 360, satMin: 0.2, valMin: 0.2 }, // 紅色（尾部）
  { hueMin: 190, hueMax: 250, satMin: 0.2, valMin: 0.2 }, // 藍色
  { hueMin: 45, hueMax: 75, satMin: 0.2, valMin: 0.5 },   // 螢光黃綠（高明度）
  { hueMin: 15, hueMax: 35, satMin: 0.2, valMin: 0.6 },   // 螢光橘/桃紅

  // 飽和度偏低但偏紅/藍 → 鉛筆壓痕或淡色筆跡
  { hueMin: 350, hueMax: 15, satMin: 0.1, valMin: 0.25 },
  { hueMin: 180, hueMax: 260, satMin: 0.1, valMin: 0.25 },
]

// RGB → HSV
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

function isNearColor(r: number, g: number, b: number, ranges: HSVRange[]): boolean {
  const [h, s, v] = rgbToHsv(r, g, b)
  return ranges.some(range =>
    ((h >= range.hueMin && h <= range.hueMax) ||
     (range.hueMin > range.hueMax && (h >= range.hueMin || h <= range.hueMax))) &&
    s >= range.satMin && v >= range.valMin
  )
}

// 取得背景色（取圖片角落的像素平均，避免誤判筆記區為背景）
function getBackground(data: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  const corners = [
    [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]
  ]
  let r = 0, g = 0, b = 0
  for (const [x, y] of corners) {
    const i = (y * w + x) * 4
    r += data[i]; g += data[i + 1]; b += data[i + 2]
  }
  return [Math.round(r / 4), Math.round(g / 4), Math.round(b / 4)]
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
      const w = canvas.width, h = canvas.height
      const [bgR, bgG, bgB] = getBackground(pixels, w, h)

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
        if (isNearColor(r, g, b, MARK_RANGES)) {
          pixels[i] = bgR
          pixels[i + 1] = bgG
          pixels[i + 2] = bgB
        }
      }
      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => reject(new Error('圖片載入失敗'))
    img.src = dataUrl
  })
}
