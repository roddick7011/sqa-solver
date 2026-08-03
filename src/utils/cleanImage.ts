// 手寫清除引擎 v4 — 連續淡化模式
//
// 取代 binary erase，改用 smoothstep alpha blending
// 支援即時 slider 調整，不破壞黑色印刷內容

export interface FadeParams {
  redFade: number        // 0-100, default 70
  blueFade: number       // 0-100, default 70
  sensitivity: number    // 0-100, default 50
  blackProtect: number   // 0-100, default 80
  bgClean: number        // 0-100, default 50
}

export interface CleanResult {
  beforeUrl: string
  afterUrl: string
  elapsedMs: number
}

const DEFAULT_PARAMS: FadeParams = {
  redFade: 70,
  blueFade: 70,
  sensitivity: 50,
  blackProtect: 80,
  bgClean: 50,
}

// ═══ Smoothstep ═══
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// ═══ Box blur (for background estimation) ═══
function boxBlurChannel(
  channel: Float32Array, w: number, h: number, kernel: number
): Float32Array {
  const out = new Float32Array(w * h)
  const half = Math.floor(kernel / 2)
  const tmp = new Float32Array(w * h)

  for (let y = 0; y < h; y++) {
    let sum = 0, count = 0
    const offset = y * w
    for (let x = -half; x < w; x++) {
      if (x >= 0 && x < w) { sum += channel[offset + x]; count++ }
      const outX = x - half
      if (outX >= 0 && outX < w) { tmp[offset + outX] = sum / count; sum -= channel[offset + outX]; count-- }
    }
  }

  for (let x = 0; x < w; x++) {
    let sum = 0, count = 0
    for (let y = -half; y < h; y++) {
      if (y >= 0 && y < h) { sum += tmp[y * w + x]; count++ }
      const outY = y - half
      if (outY >= 0 && outY < h) { out[outY * w + x] = sum / count; sum -= tmp[outY * w + x]; count-- }
    }
  }
  return out
}

// ═══ Sauvola binarization ═══
function sauvolaThreshold(
  gray: Float32Array, w: number, h: number,
  winSize: number, k: number, R: number
): Uint8Array {
  const out = new Uint8Array(w * h)
  const half = Math.floor(winSize / 2)
  const wp1 = w + 1
  const integral = new Float64Array(wp1 * (h + 1))
  const sqInt = new Float64Array(wp1 * (h + 1))

  for (let y = 0; y < h; y++) {
    let rs = 0, sqRs = 0
    for (let x = 0; x < w; x++) {
      const v = gray[y * w + x]
      rs += v; sqRs += v * v
      integral[(y + 1) * wp1 + x + 1] = integral[y * wp1 + x + 1] + rs
      sqInt[(y + 1) * wp1 + x + 1] = sqInt[y * wp1 + x + 1] + sqRs
    }
  }

  function rect(a: Float64Array, x1: number, y1: number, x2: number, y2: number) {
    return a[y2 * wp1 + x2] - a[y1 * wp1 + x2] - a[y2 * wp1 + x1] + a[y1 * wp1 + x1]
  }

  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - half), y2 = Math.min(h, y + half + 1)
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - half), x2 = Math.min(w, x + half + 1)
      const n = (x2 - x1) * (y2 - y1)
      const mean = rect(integral, x1, y1, x2, y2) / n
      const sqM = rect(sqInt, x1, y1, x2, y2) / n
      const vr = sqM - mean * mean
      const stdev = Math.sqrt(Math.max(0, vr))
      const t = mean * (1 + k * (stdev / R - 1))
      out[y * w + x] = gray[y * w + x] < t ? 0 : 255
    }
  }
  return out
}

// ═══ 主清理流程 ═══
export async function cleanDocument(
  dataUrl: string,
  params: Partial<FadeParams> = {}
): Promise<CleanResult> {
  const t0 = Date.now()
  const p = { ...DEFAULT_PARAMS, ...params }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const w = img.width, h = img.height
      const N = w * h
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, w, h)
      const px = imageData.data

      // ══ Step 1: Extract raw RGB ══
      const rawR = new Float32Array(N)
      const rawG = new Float32Array(N)
      const rawB = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        rawR[i] = px[i * 4]; rawG[i] = px[i * 4 + 1]; rawB[i] = px[i * 4 + 2]
      }

      // ══ Step 2: Local white balance (box blur) ══
      const blurKernel = 31 + Math.round(p.bgClean * 0.8)  // bgClean=0→31px, bgClean=100→111px
      const bgR = boxBlurChannel(rawR, w, h, blurKernel)
      const bgG = boxBlurChannel(rawG, w, h, blurKernel)
      const bgB = boxBlurChannel(rawB, w, h, blurKernel)

      // ══ Step 3: Normalize ══
      const Rn = new Float32Array(N)
      const Gn = new Float32Array(N)
      const Bn = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        Rn[i] = Math.min(255, Math.max(0, 255 * rawR[i] / Math.max(bgR[i], 1)))
        Gn[i] = Math.min(255, Math.max(0, 255 * rawG[i] / Math.max(bgG[i], 1)))
        Bn[i] = Math.min(255, Math.max(0, 255 * rawB[i] / Math.max(bgB[i], 1)))
      }

      // ══ Step 4: Color scores on normalized channels ══
      const redScore = new Float32Array(N)
      const bluePurpleScore = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        const r = Rn[i], g = Gn[i], b = Bn[i]
        const redS = r - (g + b) / 2
        const blueS = b - (r + g) / 2
        const purpleS = (r + b) / 2 - g
        redScore[i] = redS
        bluePurpleScore[i] = Math.max(blueS, purpleS)
      }

      // ══ Step 5: Smoothstep → confidence [0,1] ══
      // sensitivity maps 0-100 → thresholds
      const sensLo = 2 + p.sensitivity * 0.1    // 2..12
      const sensHi = 20 + p.sensitivity * 0.6   // 20..80

      const redConf = new Float32Array(N)
      const blueConf = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        redConf[i] = smoothstep(sensLo, sensHi, redScore[i])
        blueConf[i] = smoothstep(sensLo, sensHi, bluePurpleScore[i])
      }

      // ══ Step 6: Final color alpha (max, not sum — avoids double-counting purple) ══
      const colorAlpha = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        const ra = redConf[i] * p.redFade / 100
        const ba = blueConf[i] * p.blueFade / 100
        colorAlpha[i] = Math.max(ra, ba)
      }

      // ══ Step 7: Black protection ══
      // commonDarkness = 255 - max(R,G,B); dark → high protection
      const darkLow = 120, darkHigh = 220
      const bpStrength = p.blackProtect / 100

      for (let i = 0; i < N; i++) {
        const maxChan = Math.max(Rn[i], Gn[i], Bn[i])
        const darkness = 255 - maxChan
        const darkConf = smoothstep(darkLow, darkHigh, darkness)
        colorAlpha[i] *= (1 - darkConf * bpStrength)
      }

      // ══ Step 8: Grayscale blending ══
      // normalGray = luminance
      // colorRemovedGray = max channel (removes colored ink)
      // outputGray = normalGray + alpha * (colorRemovedGray - normalGray)
      const outputGray = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        const r = Rn[i], g = Gn[i], b = Bn[i]
        const normalGray = 0.2126 * r + 0.7152 * g + 0.0722 * b
        const colorRemovedGray = Math.max(r, g, b)
        const a = colorAlpha[i]
        outputGray[i] = normalGray + a * (colorRemovedGray - normalGray)
        // Clamp
        if (outputGray[i] < 0) outputGray[i] = 0
        if (outputGray[i] > 255) outputGray[i] = 255
      }

      // ══ Step 9: Sauvola binarization ══
      const binary = sauvolaThreshold(outputGray, w, h, 41, 0.22, 128)

      // ══ Step 10: Output ══
      for (let i = 0; i < N; i++) {
        px[i * 4] = binary[i]
        px[i * 4 + 1] = binary[i]
        px[i * 4 + 2] = binary[i]
      }
      ctx.putImageData(imageData, 0, 0)

      resolve({
        beforeUrl: dataUrl,
        afterUrl: canvas.toDataURL('image/png'),
        elapsedMs: Date.now() - t0,
      })
    }
    img.onerror = () => reject(new Error('圖片載入失敗'))
    img.src = dataUrl
  })
}
