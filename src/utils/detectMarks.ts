// M3 手寫標記偵測
// 送回 bounding boxes → 用來引導顏色分割
import type { AIConfig } from '../ai/types'

interface DetectedMark {
  bbox: { x1: number; y1: number; x2: number; y2: number }
  type: 'colored_ink' | 'black_pen' | 'highlight' | 'cross_out'
  confidence: number
}

const DETECT_PROMPT = `你是文件手寫標註偵測器。只輸出 JSON，不解題、不OCR、不修改圖片。

分析題目照片，找出後來加入的手寫內容：
- 手寫文字/算式/答案
- 手畫圈選/底線
- 勾、叉、箭頭、修正記號

保留：印刷文字、題號、表格線、插圖、幾何圖形。

用 0-1000 正規化座標回傳，左上角為原點。
只回傳 confidence >= 0.7 的區域。
若無法確定某區域是否為手寫，不要納入。

JSON 格式：
{"marks":[{"bbox":{"x1":120,"y1":200,"x2":850,"y2":600},"type":"colored_ink","confidence":0.92}]}

type 只能是 colored_ink / black_pen / highlight / cross_out 之一。`

export async function detectMarks(dataUrl: string, cfg: AIConfig): Promise<DetectedMark[]> {
  const model = cfg.provider === 'claude' ? cfg.claudeModel : cfg.customModel || 'gpt-4o'
  const baseUrl = cfg.customBaseUrl || ''
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`

  const m = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
  const parts: any[] = m ? [{
    type: 'image_url',
    image_url: { url: `data:${m[1]};base64,${m[2]}` }
  }, {
    type: 'text',
    text: DETECT_PROMPT
  }] : [{ type: 'text', text: DETECT_PROMPT }]

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }
  if (cfg.apiKey) headers['authorization'] = `Bearer ${cfg.apiKey}`
  if (cfg.apiKey) headers['x-api-key'] = cfg.apiKey

  let retries = 3
  while (retries > 0) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: parts }],
          max_tokens: 2048,
          response_format: { type: 'json_object' },
        }),
      })
      if (!res.ok) {
        retries--
        if ((res.status >= 500 || res.status === 429) && retries > 0) {
          await new Promise(r => setTimeout(r, 2000))
          continue
        }
        throw new Error(`M3 偵測失敗 ${res.status}`)
      }
      const data = await res.json()
      let text = data.choices?.[0]?.message?.content ?? ''
      // 處理可能的 thinking 標籤
      text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
      // 找 JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.marks && Array.isArray(parsed.marks)) {
          return parsed.marks as DetectedMark[]
        }
      }
      return []
    } catch (e: any) {
      retries--
      if (retries <= 0) throw e
      await new Promise(r => setTimeout(r, 2000))
    }
  }
  return []
}
