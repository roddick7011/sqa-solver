// 把 AIConfig 編碼成可分享的字串（base64 + 前綴），讓使用者從電腦複製到手機貼上
import type { AIConfig } from '../ai/types'
import { DEFAULT_AI_CONFIG } from '../ai/types'

const PREFIX = 'SQA1:'  // versioned prefix

export function encodeConfig(cfg: AIConfig): string {
  const minimal = {
    p: cfg.provider,
    k: cfg.apiKey || '',
    cm: cfg.provider === 'claude' ? cfg.claudeModel : '',
    om: cfg.provider === 'openai' ? cfg.openaiModel : '',
    cb: cfg.provider === 'custom' ? cfg.customBaseUrl : '',
    ct: cfg.provider === 'custom' ? cfg.customModel : '',
  }
  const json = JSON.stringify(minimal)
  return PREFIX + btoa(unescape(encodeURIComponent(json)))
}

export interface DecodeResult {
  ok: boolean
  config?: AIConfig
  error?: string
}

export function decodeConfig(s: string): DecodeResult {
  try {
    const trimmed = s.trim()
    const payload = trimmed.startsWith(PREFIX) ? trimmed.slice(PREFIX.length) : trimmed
    const json = decodeURIComponent(escape(atob(payload)))
    const parsed = JSON.parse(json)
    if (typeof parsed !== 'object' || !parsed.p) {
      return { ok: false, error: '格式不對，缺少 provider' }
    }
    const provider = parsed.p
    if (provider !== 'claude' && provider !== 'openai' && provider !== 'custom') {
      return { ok: false, error: `不支援的 provider：${provider}` }
    }
    return {
      ok: true,
      config: {
        ...DEFAULT_AI_CONFIG,
        provider,
        apiKey: parsed.k ?? '',
        claudeModel: parsed.cm ?? DEFAULT_AI_CONFIG.claudeModel,
        openaiModel: parsed.om ?? DEFAULT_AI_CONFIG.openaiModel,
        customBaseUrl: parsed.cb ?? DEFAULT_AI_CONFIG.customBaseUrl,
        customModel: parsed.ct ?? DEFAULT_AI_CONFIG.customModel,
      },
    }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? '解析失敗' }
  }
}
