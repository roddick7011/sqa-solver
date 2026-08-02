// 共用型別定義
export type Stage = 'junior' | 'senior'  // 國中 / 高中
export type Grade = 7 | 8 | 9 | 10 | 11 | 12

export interface Subject {
  id: string
  name: string
  emoji: string
  color: string  // tailwind class fragment, e.g. "rose"
}

// 108 課綱章節
export interface Chapter {
  id: string       // e.g. "math-1"
  name: string     // e.g. "數與量"
  grade: Grade     // 所屬年級
  subjectId: string
}

// 小孩 / 使用者 profile（一台裝置可有多個，例如家裡兩個小孩）
export interface Profile {
  id: string              // uuid
  name: string            // 顯示名稱（小華、小明…）
  emoji: string           // 個人 emoji（預設 🌱）
  createdAt: number
  archived?: boolean      // 軟刪除（保留 notes 30 天後可清）
}

// 一筆錯題筆記（康乃爾筆記）
export interface WrongNote {
  id?: number
  createdAt: number

  // 屬於哪個 profile
  profileId: string

  // 分類
  stage: Stage
  grade: Grade
  subjectId: string
  chapterId?: string       // 🆕 章節（可選，因為舊資料沒有）

  // 題目
  questionText: string
  questionImage?: string  // base64 dataURL

  // AI 解答
  aiSolution: string

  // 康乃爾筆記
  cues: string         // 左欄：線索 / 關鍵字 / 提問
  notes: string        // 右欄：解題詳記
  summary: string      // 底部：摘要 / 反思

  // 後設
  tags: string[]
  starred: boolean

  // 複習狀態（SRS）
  reviewCount: number       // 累計複習次數
  intervalDays: number      // 目前間隔天數
  easeFactor: number        // 簡易 SM-2 難度因子，預設 2.5
  nextReviewAt: number      // 下次複習時間（timestamp）
  lastResult?: 'correct' | 'wrong'  // 上次結果
  lastReviewAt?: number     // 上次複習時間
}
