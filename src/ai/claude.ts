import type { AISolver, AIConfig, CornellAnalysis, CornellAnalysisInput, SolveInput, SolveOutput } from './types'
import { CORNELL_ANALYSIS_PROMPT, SOLVER_SYSTEM_PROMPT } from './types'
import { tryParseCornellAnalysis, tryParseSolverOutput } from './parse'

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

export class ClaudeSolver implements AISolver {
  readonly id = 'claude'
  readonly displayName = 'Claude (Anthropic)'

  constructor(private cfg: AIConfig) {}

  validateConfig(): string | null {
    if (!this.cfg.apiKey) return '請填入 Anthropic API Key'
    if (!this.cfg.claudeModel) return '請選擇 Claude 模型'
    return null
  }

  async solve(input: SolveInput, signal?: AbortSignal): Promise<SolveOutput> {
    const userContent = buildUserContent(input)

    const body = {
      model: this.cfg.claudeModel,
      max_tokens: 2048,
      system: SOLVER_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userContent as any },
      ],
    }

    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.cfg.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Claude API 錯誤 ${res.status}: ${text.slice(0, 200)}`)
    }

    const data = await res.json()
    const text = (data.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')

    return tryParseSolverOutput(text || '(Claude 沒回傳內容)')
  }

  async analyzeCornell(input: CornellAnalysisInput, signal?: AbortSignal): Promise<CornellAnalysis> {
    const userContent = buildCornellUserContent(input)

    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.cfg.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.cfg.claudeModel,
        max_tokens: 800,
        system: CORNELL_ANALYSIS_PROMPT,
        messages: [{ role: 'user', content: userContent as any }],
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Claude API 錯誤 ${res.status}: ${text.slice(0, 200)}`)
    }

    const data = await res.json()
    const text = (data.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')

    return tryParseCornellAnalysis(text || '')
  }

  async testConnection(signal?: AbortSignal): Promise<string> {
    const start = Date.now()
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.cfg.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.cfg.claudeModel,
        max_tokens: 8,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status} — ${text.slice(0, 200) || res.statusText}`)
    }
    const ms = Date.now() - start
    return `連線成功（${this.cfg.claudeModel}，${ms} ms）`
  }
}

// 共用的 user content 組裝（圖片 + 文字）
export function buildUserContent(input: SolveInput) {
  const ctx = `科目：${input.subjectName}\n年級：${input.gradeLabel}`
  const parts: any[] = []

  if (input.questionImage) {
    const m = input.questionImage.match(/^data:(image\/\w+);base64,(.+)$/)
    if (m) {
      parts.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: m[1],
          data: m[2],
        },
      })
    }
  }

  parts.push({
    type: 'text',
    text: `${ctx}\n\n題目：\n${input.questionText || '(請看圖片)'}`,
  })

  return parts
}

function buildCornellUserContent(input: CornellAnalysisInput) {
  const ctx = `科目：${input.subjectName}\n年級：${input.gradeLabel}`
  const parts: any[] = []

  if (input.questionImage) {
    const m = input.questionImage.match(/^data:(image\/\w+);base64,(.+)$/)
    if (m) {
      parts.push({
        type: 'image',
        source: { type: 'base64', media_type: m[1], data: m[2] },
      })
    }
  }

  parts.push({
    type: 'text',
    text:
      `${ctx}\n\n題目：\n${input.questionText || '(請看圖片)'}\n\n` +
      `已詳解：\n${input.aiSolution}\n\n` +
      `請根據以上題目與詳解，輸出 cues 與 summary 的 JSON。`,
  })

  return parts
}
