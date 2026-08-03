// 手寫清除引擎 v3
// 「彩色偵測 + 黑色印刷保護 + 條件式清除」
//
// 處理筆跡壓在印刷文字上的情況（紫色圈線穿過 5.97×10²⁴ 等）
// 原理：局部白平衡 → 雙門檻彩度偵測 → 保護印刷字 → 僅清除純筆跡區

export interface CleanResult {
  beforeUrl: string
  afterUrl: string
  detectedCount: number
  protectedCount: number   // 被保護的印刷像素數
  elapsedMs: number
}

// ═══════════════════════════════════════════
// Box blur (for background estimation)
// ═══════════════════════════════════════════
function boxBlurChannel(channel: Float32Array, w: number, h: number, kernel: number): Float32Array {
  const out = new Float32Array(w * h)
  const half = Math.floor(kernel / 2)

  // horizontal pass
  const tmp = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    let sum = 0, count = 0
    const rowStart = y * w
    for (let x = -half; x < w + half; x++) {
      if (x >= 0 && x < w) { sum += channel[rowStart + x]; count++ }
      if (x >= half + half) {
        const outX = x - half - half
        if (outX >= 0 && outX < w) {
          tmp[rowStart + outX] = sum / count
          sum -= channel[rowStart + outX]
          count--
        }
      }
    }
  }

  // vertical pass
  for (let x = 0; x < w; x++) {
    let sum = 0, count = 0
    for (let y = -half; y < h + half; y++) {
      if (y >= 0 && y < h) { sum += tmp[y * w + x]; count++ }
      if (y >= half + half) {
        const outY = y - half - half
        if (outY >= 0 && outY < h) {
          out[outY * w + x] = sum / count
          sum -= tmp[outY * w + x]
          count--
        }
      }
    }
  }
  return out
}

// ═══════════════════════════════════════════
// Sauvola binarization (proper implementation)
// T = mean * (1 + k * (stdev / R - 1))
// ═══════════════════════════════════════════
function sauvolaThreshold(gray: Float32Array, w: number, h: number, winSize: number, k: number, R: number): Uint8Array {
  const out = new Uint8Array(w * h)
  const half = Math.floor(winSize / 2)

  // integral image for mean
  const integral = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x]
      integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + rowSum
    }
  }

  // integral of squared values
  const sqIntegral = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    for (let x = 0; x < w; x++) {
      const v = gray[y * w + x]
      rowSum += v * v
      sqIntegral[(y + 1) * (w + 1) + x + 1] = sqIntegral[y * (w + 1) + x + 1] + rowSum
    }
  }

  function rectSum(arr: Float64Array, x1: number, y1: number, x2: number, y2: number) {
    return arr[y2 * (w + 1) + x2] - arr[y1 * (w + 1) + x2] - arr[y2 * (w + 1) + x1] + arr[y1 * (w + 1) + x1]
  }

  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - half), y2 = Math.min(h, y + half + 1)
    const count = (y2 - y1) * (Math.min(w, w - 1 + half + 1) - Math.max(0, 0 - half))
    const x1 = Math.max(0, 0), x2 = Math.min(w, w)
    for (let x = 0; x < w; x++) {
      const xl = Math.max(0, x - half), xr = Math.min(w, x + half + 1)
      const n = (xr - xl) * (y2 - y1)
      const mean = rectSum(integral, xl, y1, xr, y2) / n
      const sqMean = rectSum(sqIntegral, xl, y1, xr, y2) / n
      const variance = sqMean - mean * mean
      const stdev = Math.sqrt(Math.max(0, variance))
      const t = mean * (1 + k * (stdev / R - 1))
      out[y * w + x] = gray[y * w + x] < t ? 0 : 255
    }
  }

  return out
}

// ═══════════════════════════════════════════
// Main cleaning pipeline
// ═══════════════════════════════════════════
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
      const px = imageData.data
      const N = w * h

      // ══ Step 1: Extract RGB channels ══
      const chR = new Float32Array(N)
      const chG = new Float32Array(N)
      const chB = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        chR[i] = px[i * 4]
        chG[i] = px[i * 4 + 1]
        chB[i] = px[i * 4 + 2]
      }

      // ══ Step 2: Local background estimation (box blur 71px) ══
      const BLUR_KERNEL = 71
      const bgR = boxBlurChannel(chR, w, h, BLUR_KERNEL)
      const bgG = boxBlurChannel(chG, w, h, BLUR_KERNEL)
      const bgB = boxBlurChannel(chB, w, h, BLUR_KERNEL)

      // ══ Step 3: Normalize colors ══
      const Rn = new Float32Array(N)
      const Gn = new Float32Array(N)
      const Bn = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        Rn[i] = Math.min(255, Math.max(0, 255 * chR[i] / Math.max(bgR[i], 1)))
        Gn[i] = Math.min(255, Math.max(0, 255 * chG[i] / Math.max(bgG[i], 1)))
        Bn[i] = Math.min(255, Math.max(0, 255 * chB[i] / Math.max(bgB[i], 1)))
      }

      // ══ Step 4: Color detection with dual threshold ══
      const strongColorMask = new Uint8Array(N)
      const weakColorMask = new Uint8Array(N)

      for (let i = 0; i < N; i++) {
        const r = Rn[i], g = Gn[i], b = Bn[i]
        const maxN = Math.max(r, g, b)
        const minN = Math.min(r, g, b)
        const absChroma = maxN - minN
        const relChroma = absChroma / Math.max(maxN, 1)

        const redScore = r - (g + b) / 2
        const blueScore = b - (r + g) / 2
        const purpleScore = (r + b) / 2 - g

        // Strong: high confidence colored ink
        const strong =
          ((absChroma > 20 && relChroma > 0.08) ||
           redScore > 12 ||
           blueScore > 8 ||
           purpleScore > 8)

        // Weak: possible colored ink (includes edges, low-saturation strokes)
        const weak =
          ((absChroma > 6 && relChroma > 0.025) ||
           redScore > 5 ||
           blueScore > 3 ||
           purpleScore > 3)

        if (strong) strongColorMask[i] = 1
        if (weak) weakColorMask[i] = 1
      }

      // ══ Step 5: Color mask cleanup (close holes, minimal dilate) ══
      // Morphological close: dilate then erode within weakColorMask
      const closedColorMask = morphClose(strongColorMask, weakColorMask, w, h, 1)

      // ══ Step 6: Common-black grayscale ══
      const neutralGray = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        neutralGray[i] = Math.max(Rn[i], Gn[i], Bn[i])  // max channel = nearest to white for colored ink
      }

      // ══ Step 7: Printed text seed (Sauvola on non-colored areas) ══
      const notColored = new Uint8Array(N)
      for (let i = 0; i < N; i++) {
        if (!weakColorMask[i]) notColored[i] = 1
      }

      const sauvolaRaw = sauvolaThreshold(neutralGray, w, h, 41, 0.22, 128)
      const printedSeed = new Uint8Array(N)
      for (let i = 0; i < N; i++) {
        // Black pixel AND not in color mask → printed seed
        if (sauvolaRaw[i] === 0 && !weakColorMask[i]) {
          printedSeed[i] = 1
        }
      }

      // ══ Step 8: Dark candidate (dark in all 3 channels) ══
      const darkCandidate = new Uint8Array(N)
      for (let i = 0; i < N; i++) {
        if (Rn[i] < 90 && Gn[i] < 90 && Bn[i] < 90) {
          darkCandidate[i] = 1
        }
      }

      // ══ Step 9: Protected print mask (grow printed seed 1-2px into color mask) ══
      const protectedPrint = new Uint8Array(N)
      for (let i = 0; i < N; i++) {
        if (printedSeed[i]) protectedPrint[i] = 1
      }

      // Grow printedSeed into colorMask area (max 2px, must be darkCandidate)
      for (let iter = 0; iter < 2; iter++) {
        const grown = new Uint8Array(N)
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = y * w + x
            if (protectedPrint[i] || !closedColorMask[i]) continue
            // Check if neighbor is protectedPrint AND this pixel is dark
            let hasNeighbor = false
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
              const nx = x + dx, ny = y + dy
              if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
              if (protectedPrint[ny * w + nx]) { hasNeighbor = true; break }
            }
            if (hasNeighbor && darkCandidate[i]) grown[i] = 1
          }
        }
        for (let i = 0; i < N; i++) {
          if (grown[i]) protectedPrint[i] = 1
        }
      }

      // ══ Step 10: Erase mask = colorMask AND NOT protectedPrint ══
      const eraseMask = new Uint8Array(N)
      let eraseCount = 0, protectCount = 0
      for (let i = 0; i < N; i++) {
        if (closedColorMask[i] && !protectedPrint[i]) {
          eraseMask[i] = 1
          eraseCount++
        } else if (closedColorMask[i] && protectedPrint[i]) {
          protectCount++
        }
      }

      // ══ Step 11: Fill erased areas with white ══
      for (let i = 0; i < N; i++) {
        if (eraseMask[i]) {
          neutralGray[i] = 255
        }
      }

      // ══ Step 12: Final binarization (Sauvola) ══
      const binary = sauvolaThreshold(neutralGray, w, h, 41, 0.22, 128)

      // ══ Step 13: Enforce eraseMask = white, protectedPrint = black ══
      for (let i = 0; i < N; i++) {
        if (eraseMask[i]) binary[i] = 255
        if (protectedPrint[i] && closedColorMask[i]) binary[i] = 0
      }

      // ══ Step 14: Output ══
      for (let i = 0; i < N; i++) {
        px[i * 4] = binary[i]
        px[i * 4 + 1] = binary[i]
        px[i * 4 + 2] = binary[i]
      }
      ctx.putImageData(imageData, 0, 0)

      resolve({
        beforeUrl: dataUrl,
        afterUrl: canvas.toDataURL('image/png'),
        detectedCount: eraseCount,
        protectedCount: protectCount,
        elapsedMs: Date.now() - t0,
      })
    }
    img.onerror = () => reject(new Error('圖片載入失敗'))
    img.src = dataUrl
  })
}

// ═══ Morphological close (dilate + erode) within bounds ═══
function morphClose(seeds: Uint8Array, bounds: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  // Dilate within bounds
  let tmp = seeds
  for (let r = 0; r < radius; r++) {
    const next = new Uint8Array(tmp.length)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (!bounds[i]) continue
        let found = false
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
            if (tmp[ny * w + nx]) { found = true; break }
          }
          if (found) break
        }
        if (found) next[i] = 1
      }
    }
    tmp = next
  }
  return tmp
}
