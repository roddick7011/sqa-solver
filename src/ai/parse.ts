// 解析 AI 回傳（可能是純文字、JSON、或 markdown code block 包 JSON）
import type { CornellAnalysis } from './types'

export function tryParseSolverOutput(raw: string): {
  solution: string
  cues?: string
  summary?: string
} {
  const jsonText = extractJson(raw)
  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText)
      if (parsed && typeof parsed === 'object') {
        return {
          solution: typeof parsed.solution === 'string' ? parsed.solution : raw,
          question_clean: typeof parsed.question_clean === 'string' ? parsed.question_clean : undefined,  // 🆕
          cues: typeof parsed.cues === 'string' ? parsed.cues : undefined,
          summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
        }
      }
    } catch {
      // 解析失敗 → 視為純文字
    }
  }
  return { solution: raw }
}

export function tryParseCornellAnalysis(raw: string): CornellAnalysis {
  const jsonText = extractJson(raw)
  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText)
      if (parsed && typeof parsed === 'object') {
        return {
          cues: typeof parsed.cues === 'string' ? parsed.cues : '',
          summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        }
      }
    } catch {}
  }
  // fallback：把整段視為 cues
  return { cues: raw, summary: '' }
}

function extractJson(s: string): string | null {
  // 先試 markdown code block ```json ... ``` 或 ``` ... ```
  const m = s.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i)
  if (m) return m[1]
  // 否則找第一個完整 {...}（用括號配對）
  const start = s.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inStr = false
  let escape = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (escape) { escape = false; continue }
    if (c === '\\') { escape = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return s.slice(start, i + 1)
    }
  }
  return null
}
