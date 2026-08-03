import type { AISolver, AIConfig, CornellAnalysis, CornellAnalysisInput, SolveInput, SolveOutput } from './types'
import { CORNELL_ANALYSIS_PROMPT, SOLVER_SYSTEM_PROMPT } from './types'
import { tryParseCornellAnalysis, tryParseSolverOutput } from './parse'

export abstract class OpenAICompatSolver implements AISolver {
  abstract readonly id: string
  abstract readonly displayName: string
  protected abstract baseUrl: string
  protected abstract apiKeyHeader(): Record<string, string>
  protected abstract modelName(): string

  constructor(protected cfg: AIConfig) {}

  validateConfig(): string | null {
    if (!this.cfg.apiKey) return '請填入 API Key'
    if (!this.modelName()) return '請選擇模型'
    return null
  }

  async solve(input: SolveInput, signal?: AbortSignal): Promise<SolveOutput> {
    const userContent = buildOpenAIUserContent(input)

    const body = {
      model: this.modelName(),
      messages: [
        { role: 'system', content: SOLVER_SYSTEM_PROMPT },
        { role: 'user', content: userContent as any },
      ],
      max_tokens: 2048,
    }

    // Custom solver 用 user-config 的 baseUrl
    const url = this.id === 'custom'
      ? `${(this.cfg.customBaseUrl || '').replace(/\/$/, '')}/chat/completions`
      : `${this.baseUrl}/chat/completions`

    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        ...this.apiKeyHeader(),
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`${this.displayName} 錯誤 ${res.status}: ${text.slice(0, 200)}`)
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? ''

    return tryParseSolverOutput(text || `(${this.displayName} 沒回傳內容)`)
  }

  async analyzeCornell(input: CornellAnalysisInput, signal?: AbortSignal): Promise<CornellAnalysis> {
    const userContent = buildCornellOpenAIContent(input)

    const url = this.id === 'custom'
      ? `${(this.cfg.customBaseUrl || '').replace(/\/$/, '')}/chat/completions`
      : `${this.baseUrl}/chat/completions`

    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        ...this.apiKeyHeader(),
      },
      body: JSON.stringify({
        model: this.modelName(),
        messages: [
          { role: 'system', content: CORNELL_ANALYSIS_PROMPT },
          { role: 'user', content: userContent as any },
        ],
        max_tokens: 800,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`${this.displayName} 錯誤 ${res.status}: ${text.slice(0, 200)}`)
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? ''
    return tryParseCornellAnalysis(text || '')
  }

  async testConnection(signal?: AbortSignal): Promise<string> {
    const start = Date.now()
    const url = this.id === 'custom'
      ? `${(this.cfg.customBaseUrl || '').replace(/\/$/, '')}/chat/completions`
      : `${this.baseUrl}/chat/completions`

    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        ...this.apiKeyHeader(),
      },
      body: JSON.stringify({
        model: this.modelName(),
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status} — ${text.slice(0, 200) || res.statusText}`)
    }

    const ms = Date.now() - start
    return `連線成功（${this.modelName()}，${ms} ms）`
  }
}

export class OpenAISolver extends OpenAICompatSolver {
  readonly id = 'openai'
  readonly displayName = 'OpenAI'
  protected baseUrl = 'https://api.openai.com/v1'
  protected apiKeyHeader() {
    return { authorization: `Bearer ${this.cfg.apiKey}` }
  }
  protected modelName() { return this.cfg.openaiModel }
}

// 自訂 OpenAI 相容端點（Ollama / LM Studio / OpenRouter / 其他）
export class CustomSolver extends OpenAICompatSolver {
  readonly id = 'custom'
  readonly displayName = '自訂 OpenAI 相容 API'
  protected baseUrl = ''
  protected apiKeyHeader(): Record<string, string> {
    // 某些本地端點不需要 key，但仍可能需要 Bearer
    if (!this.cfg.apiKey) return {}
    return { authorization: `Bearer ${this.cfg.apiKey}` }
  }
  protected modelName() { return this.cfg.customModel }
}

function buildOpenAIUserContent(input: SolveInput) {
  const ctx = `科目：${input.subjectName}\n年級：${input.gradeLabel}${input.ignoreMarks ? '\n⚠️ 請忽略圖片中的紅筆/藍筆/螢光筆/鉛筆手寫標記，只取原始印刷題目。' : ''}`
  const parts: any[] = []

  if (input.questionImage) {
    parts.push({
      type: 'image_url',
      image_url: { url: input.questionImage },
    })
  }

  parts.push({
    type: 'text',
    text: `${ctx}\n\n題目：\n${input.questionText || '(請看圖片)'}`,
  })

  return parts
}

function buildCornellOpenAIContent(input: CornellAnalysisInput) {
  const ctx = `科目：${input.subjectName}\n年級：${input.gradeLabel}`
  const parts: any[] = []

  if (input.questionImage) {
    parts.push({
      type: 'image_url',
      image_url: { url: input.questionImage },
    })
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
