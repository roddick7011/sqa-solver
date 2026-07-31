// AI 設定儲存 + Solver 分派
import type { AISolver, AIConfig } from './types'
import { DEFAULT_AI_CONFIG } from './types'
import { ClaudeSolver } from './claude'
import { OpenAISolver, CustomSolver } from './openai'

const STORAGE_KEY = 'sqa:ai-config'

export function loadAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_AI_CONFIG }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_AI_CONFIG, ...parsed }
  } catch {
    return { ...DEFAULT_AI_CONFIG }
  }
}

export function saveAIConfig(cfg: AIConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

export function makeSolver(cfg: AIConfig): AISolver {
  switch (cfg.provider) {
    case 'claude': return new ClaudeSolver(cfg)
    case 'openai': return new OpenAISolver(cfg)
    case 'custom': return new CustomSolver(cfg)
    default:       return new ClaudeSolver(cfg)
  }
}
