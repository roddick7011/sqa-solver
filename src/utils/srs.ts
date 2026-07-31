// 簡化版 SM-2 間隔重複演算法
import type { WrongNote } from '../types'

const DAY = 24 * 60 * 60 * 1000
export const INITIAL_EASE = 2.5
const MIN_EASE = 1.3
const MAX_EASE = 2.8

/** 新錯題的初始複習狀態（立即可複習） */
export function makeInitialReviewState(createdAt = Date.now()) {
  return {
    reviewCount: 0,
    intervalDays: 0,
    easeFactor: INITIAL_EASE,
    nextReviewAt: createdAt,
  }
}

export type ReviewResult = 'correct' | 'wrong'

/** 根據這次答題結果計算新的複習狀態 */
export function applyReview(
  prev: Pick<WrongNote, 'reviewCount' | 'intervalDays' | 'easeFactor'>,
  result: ReviewResult,
  now = Date.now(),
): Pick<WrongNote, 'reviewCount' | 'intervalDays' | 'easeFactor' | 'nextReviewAt' | 'lastResult' | 'lastReviewAt'> {
  let { reviewCount, intervalDays, easeFactor } = prev

  if (result === 'correct') {
    reviewCount += 1
    if (reviewCount === 1) intervalDays = 1
    else if (reviewCount === 2) intervalDays = 6
    else intervalDays = Math.max(1, Math.round(intervalDays * easeFactor))
    easeFactor = Math.min(MAX_EASE, easeFactor + 0.1)
  } else {
    reviewCount = 0
    intervalDays = 1
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.2)
  }

  return {
    reviewCount,
    intervalDays,
    easeFactor,
    nextReviewAt: now + intervalDays * DAY,
    lastResult: result,
    lastReviewAt: now,
  }
}

/** 是否到期該複習 */
export function isDue(note: WrongNote, now = Date.now()): boolean {
  if (note.starred) return false
  return (note.nextReviewAt ?? 0) <= now
}

/** 計算今天到期的錯題 */
export function filterDue(notes: WrongNote[], now = Date.now()): WrongNote[] {
  return notes.filter(n => isDue(n, now))
}

/** 顯示「下次複習：今天 / 明天 / X 天後」 */
export function formatNextReview(timestamp: number, now = Date.now()): string {
  if (!timestamp) return '—'
  const diff = timestamp - now
  if (diff <= 0) return '今天'
  const days = Math.round(diff / DAY)
  if (days === 1) return '明天'
  if (days < 7) return `${days} 天後`
  if (days < 30) return `${Math.round(days / 7)} 週後`
  return `${Math.round(days / 30)} 個月後`
}

/** 連續複習天數（用 lastReviewAt 計算） */
export function calcStreak(notes: WrongNote[], now = Date.now()): number {
  const days = new Set<string>()
  for (const n of notes) {
    if (n.lastReviewAt) {
      const d = new Date(n.lastReviewAt)
      days.add(d.toISOString().slice(0, 10))
    }
  }
  let streak = 0
  const cursor = new Date(now)
  while (true) {
    const key = cursor.toISOString().slice(0, 10)
    if (days.has(key)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}
