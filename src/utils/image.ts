// 圖片工具：壓縮、dataURL ↔ Blob 互轉

export const MAX_DIMENSION = 1600
export const JPEG_QUALITY = 0.85

/**
 * 將 File / dataURL / HTMLImageElement 壓縮成 JPEG dataURL。
 * 最大邊縮到 MAX_DIMENSION，品質 0.85；對多數題目相片而言可壓到 ~200-400KB。
 */
export async function compressImage(
  source: File | string,
  maxDim = MAX_DIMENSION,
  quality = JPEG_QUALITY,
): Promise<string> {
  const img = await loadImage(source)
  const { width, height } = fitWithin(img.width, img.height, maxDim)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', quality)
}

function loadImage(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    if (typeof source === 'string') {
      img.src = source
    } else {
      img.src = URL.createObjectURL(source)
    }
  })
}

function fitWithin(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h }
  const ratio = w > h ? max / w : max / h
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
}

/** 估算 dataURL 大小（bytes） */
export function approxDataUrlSize(dataUrl: string): number {
  const idx = dataUrl.indexOf(',')
  if (idx < 0) return dataUrl.length
  return Math.ceil((dataUrl.length - idx - 1) * 3 / 4)
}
