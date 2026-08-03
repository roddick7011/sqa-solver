// 星星系統 + Streak + 凍結券
// 儲存在 localStorage key: sqa:gamification

interface GamificationState {
  stars: number           // 累積星星
  streak: number          // 連續天數
  lastReviewDate: string  // 最後複習日期 YYYY-MM-DD
  freezeUsed: number      // 本學期已用凍結次數
  todayDone: number       // 今日已答題數
  todayTarget: number     // 今日目標題數（預設 3）
  streakSaved: boolean    // 今天已保護 streak（凍結用過）
}

const KEY = 'sqa:gamification'

function load(): GamificationState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { stars: 0, streak: 0, lastReviewDate: '', freezeUsed: 0, todayDone: 0, todayTarget: 3, streakSaved: false }
}

function save(s: GamificationState) { localStorage.setItem(KEY, JSON.stringify(s)) }

// 星星階梯
export function starsForCount(n: number): number {
  if (n >= 15) return 7
  if (n >= 10) return 5
  if (n >= 5)  return 2
  if (n >= 3)  return 1
  return 0
}

// 取得目前狀態
export function getState(): GamificationState { return load() }

// 設定每日目標
export function setDailyTarget(n: number) { const s = load(); s.todayTarget = n; save(s) }

// 凍結券：用 3⭐ 換今天不中斷 streak
export function useFreeze(): { ok: boolean; msg: string } {
  const s = load()
  if (s.streakSaved) return { ok: false, msg: '今天已經用過了' }
  if (s.freezeUsed >= 3) return { ok: false, msg: '這學期凍結次數已用完（最多 3 次）' }
  if (s.stars < 3) return { ok: false, msg: '星星不夠（需要 3 顆）' }
  s.stars -= 3
  s.freezeUsed++
  s.streakSaved = true
  save(s)
  return { ok: true, msg: '✅ 已凍結！今天 streak 不會中斷' }
}

// 每日開 APP 時檢查 streak 是否該歸零
export function checkStreak() {
  const s = load()
  const today = new Date().toISOString().slice(0, 10)
  if (s.lastReviewDate === today) return s  // 今天已經檢查過
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (s.lastReviewDate && s.lastReviewDate !== yesterday && s.lastReviewDate !== today && !s.streakSaved) {
    s.streak = 0  // 中斷
  }
  // 重置每日狀態
  s.todayDone = 0
  s.streakSaved = false
  save(s)
  return s
}

// 完成複習（每答一題）
export function onReviewComplete() {
  const s = load()
  s.todayDone++
  const today = new Date().toISOString().slice(0, 10)
  if (s.lastReviewDate !== today) {
    // 新的一天
    s.lastReviewDate = today
    s.streak++
  }
  save(s)
}

// 完成今日所有題目，依題數給星星
export function onDailyDone(): { stars: number; earned: number } {
  const s = load()
  const earned = starsForCount(s.todayDone)
  s.stars += earned
  save(s)
  return { stars: s.stars, earned }
}

// 重置星星（debug / 除錯）
export function resetGamification() {
  localStorage.removeItem(KEY)
}

// 彩蛋解鎖
export function getBadges(s?: GamificationState): string[] {
  const state = s ?? load()
  const badges: string[] = []
  if (state.streak >= 3) badges.push('🔥')
  if (state.streak >= 7) badges.push('💪')
  if (state.streak >= 14) badges.push('🏆')
  if (state.streak >= 30) badges.push('👑')
  if (state.stars >= 10) badges.push('🌟')
  if (state.stars >= 50) badges.push('✨')
  return badges
}
