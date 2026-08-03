// 文件掃描濾鏡：「僅保留黑色內容，去除所有彩色筆跡」
// 流程：去色 → 填充 → 灰階 → 自適應二值化 → 純黑白輸出
//
// 不做 OCR、不用 AI，表格/公式/圖形只要是黑色的都保留

export interface CleanResult {
  beforeUrl: string    // 原始圖片
  afterUrl: string     // 清理後（純黑白）
  detectedCount: number
  elapsedMs: number
}

// ── 工具：建立 2D kernel 產生器 ──
function createKernel(w: number[], imgW: number) {
  const kw = w.length
  const kh = kw
  const offsets: number[] = []
  for (let dy = 0; dy < kh; dy++) {
    for (let dx = 0; dx < kw; dx++) {
      offsets.push((dy - Math.floor(kh / 2)) * imgW + (dx - Math.floor(kw / 2)))
    }
  }
  return { w: w.flat(), offsets, size: kw }
}

// ── 膨脹（dilate）：把 mask 向外擴張 ──
function dilate(mask: Uint8Array, w: number, h: number, radius: number = 1): Uint8Array {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (mask[idx]) {
        // 在 (x, y) 半徑內的所有像素標記為 1
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx, ny = y + dy
            if (nx >= 0 && ny >= 0 && nx < w && ny < h) {
              out[ny * w + nx] = 1
            }
          }
        }
      }
    }
  }
  return out
}

// ── 自適應二值化（局部 Sauvola 方法）──
// 對每個像素根據周圍亮度決定黑白門檻
function adaptiveThreshold(gray: Uint8Array, w: number, h: number, blockSize: number, C: number): Uint8Array {
  const out = new Uint8Array(w * h)
  const halfBlock = Math.floor(blockSize / 2)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 計算局部區塊的平均值與標準差
      let sum = 0, count = 0, sumSq = 0
      for (let dy = -halfBlock; dy <= halfBlock; dy++) {
        for (let dx = -halfBlock; dx <= halfBlock; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) {
            const v = gray[ny * w + nx]
            sum += v
            sumSq += v * v
            count++
          }
        }
      }
      const mean = sum / count
      const variance = sumSq / count - mean * mean
      const stdev = Math.sqrt(Math.max(variance, 0))
      // Sauvola: T = mean * (1 + k * (stdev / R - 1)), k=0.2, R=128
      const threshold = mean * (1 + 0.2 * (stdev / 128 - 1))
      out[y * w + x] = gray[y * w + x] < (threshold - C) ? 0 : 255
    }
  }
  return out
}

// ── 主清理流程（純黑白輸出）──
export async function cleanWithM3(dataUrl: string): Promise<CleanResult> {
  const t0 = Date.now()

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const w = img.width, h = img.height
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, w, h)
      const pixels = imageData.data
      const totalPixels = w * h

      // ── Step 1：偵測彩色像素（chroma > 門檻）──
      const colorMask = new Uint8Array(totalPixels)
      const CHROMA_THRESHOLD = 35  // 起始值

      for (let i = 0; i < totalPixels; i++) {
        const r = pixels[i * 4], g = pixels[i * 4 + 1], b = pixels[i * 4 + 2]
        const maxRGB = Math.max(r, g, b)
        const minRGB = Math.min(r, g, b)
        const chroma = maxRGB - minRGB
        if (chroma > CHROMA_THRESHOLD) {
          colorMask[i] = 1
        }
      }

      // ── Step 2：膨脹 mask（捕獲筆跡邊緣和深色中心）──
      const dilated = dilate(colorMask, w, h, 2)  // 2px 擴張

      // ── Step 3：彩色區域 → 白色 ──
      let killed = 0
      for (let i = 0; i < totalPixels; i++) {
        if (dilated[i]) {
          pixels[i * 4] = 255
          pixels[i * 4 + 1] = 255
          pixels[i * 4 + 2] = 255
          killed++
        }
      }

      // ── Step 4：灰階化 ──
      const gray = new Uint8Array(totalPixels)
      for (let i = 0; i < totalPixels; i++) {
        const r = pixels[i * 4], g = pixels[i * 4 + 1], b = pixels[i * 4 + 2]
        gray[i] = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)
      }

      // ── Step 5：自適應二值化（處理陰影與光線不均）──
      const binary = adaptiveThreshold(gray, w, h, 31, 12)

      // ── Step 6：輸出純黑白圖 ──
      for (let i = 0; i < totalPixels; i++) {
        const v = binary[i]
        pixels[i * 4] = v
        pixels[i * 4 + 1] = v
        pixels[i * 4 + 2] = v
      }
      ctx.putImageData(imageData, 0, 0)

      resolve({
        beforeUrl: dataUrl,
        afterUrl: canvas.toDataURL('image/png'),
        detectedCount: killed,
        elapsedMs: Date.now() - t0,
      })
    }
    img.onerror = () => reject(new Error('圖片載入失敗'))
    img.src = dataUrl
  })
}
