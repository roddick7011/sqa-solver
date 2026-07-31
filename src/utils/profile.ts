// 小孩 / Profile 管理工具
import type { Profile } from '../types'

const CURRENT_KEY = 'sqa:current-profile'

// 簡易 UUID（不依賴 crypto.randomUUID 以免舊瀏覽器炸）
export function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

export function getCurrentProfileId(): string | null {
  return localStorage.getItem(CURRENT_KEY)
}

export function setCurrentProfileId(id: string): void {
  localStorage.setItem(CURRENT_KEY, id)
}

export function makeProfile(name: string, emoji: string): Profile {
  return {
    id: uuid(),
    name: name.trim() || '未命名',
    emoji: emoji || '🌱',
    createdAt: Date.now(),
  }
}

export const PROFILE_EMOJIS = ['🌱', '🌟', '🌈', '🦊', '🐼', '🐯', '🐰', '🦁', '🐧', '🦄', '🌸', '🍀', '⚽', '🎨', '🎵', '🚀']

export function pickRandomEmoji(): string {
  return PROFILE_EMOJIS[Math.floor(Math.random() * PROFILE_EMOJIS.length)]
}