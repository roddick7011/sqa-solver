// Supabase 同步邏輯
// 雲端 schema（snake_case）↔ 本地 schema（camelCase）雙向轉換
import { getSupabase } from './supabase'
import { markLocalPushed } from './realtime'
import type { Profile, WrongNote } from '../types'

// ── Cloud row 型別（snake_case） ─────────────────────────

interface CloudProfile {
  id: string
  user_id: string
  name: string
  emoji: string
  created_at: string
  archived: boolean
}

interface CloudNote {
  id: string
  user_id: string
  profile_id: string
  created_at: string
  stage: string
  grade: number
  subject_id: string
  chapter_id?: string | null  // 🆕
  question_text: string
  question_image: string | null
  ai_solution: string
  cues: string
  notes: string
  summary: string
  tags: string[]
  starred: boolean
  review_count: number
  interval_days: number
  ease_factor: number
  next_review_at: string
  last_result: string | null
  last_review_at: string | null
  local_id: number | null
}

// ── 本地 ↔ 雲端轉換 ───────────────────────────────────

export function profileToCloud(p: Profile, userId: string): Omit<CloudProfile, 'user_id'> & { user_id: string } {
  return {
    id: p.id,
    user_id: userId,
    name: p.name,
    emoji: p.emoji,
    created_at: new Date(p.createdAt).toISOString(),
    archived: !!p.archived,
  }
}

export function profileFromCloud(c: CloudProfile): Profile {
  return {
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    createdAt: new Date(c.created_at).getTime(),
    archived: c.archived,
  }
}

export function noteToCloud(n: WrongNote, userId: string): Omit<CloudNote, 'user_id'> & { user_id: string } {
  return {
    id: n.id ? uuidFromNumber(n.id) : crypto.randomUUID(),
    user_id: userId,
    profile_id: n.profileId,
    created_at: new Date(n.createdAt).toISOString(),
    stage: n.stage,
    grade: n.grade,
    subject_id: n.subjectId,
    chapter_id: n.chapterId ?? null,  // 🆕
    question_text: n.questionText,
    question_image: n.questionImage ?? null,
    ai_solution: n.aiSolution,
    cues: n.cues,
    notes: n.notes,
    summary: n.summary,
    tags: n.tags,
    starred: n.starred,
    review_count: n.reviewCount,
    interval_days: n.intervalDays,
    ease_factor: n.easeFactor,
    next_review_at: new Date(n.nextReviewAt).toISOString(),
    last_result: n.lastResult ?? null,
    last_review_at: n.lastReviewAt ? new Date(n.lastReviewAt).toISOString() : null,
    local_id: n.id ?? null,
  }
}

export function noteFromCloud(c: CloudNote): WrongNote {
  return {
    // 用 local_id 對應本地 IndexedDB；若無對應就放 0（不存）
    id: undefined,
    createdAt: new Date(c.created_at).getTime(),
    profileId: c.profile_id,
    stage: c.stage as WrongNote['stage'],
    grade: c.grade as WrongNote['grade'],
    subjectId: c.subject_id,
    chapterId: c.chapter_id ?? undefined, // 🆕
    questionText: c.question_text,
    questionImage: c.question_image ?? undefined,
    aiSolution: c.ai_solution,
    cues: c.cues,
    notes: c.notes,
    summary: c.summary,
    tags: c.tags ?? [],
    starred: c.starred,
    reviewCount: c.review_count,
    intervalDays: c.interval_days,
    easeFactor: c.ease_factor,
    nextReviewAt: new Date(c.next_review_at).getTime(),
    lastResult: c.last_result as WrongNote['lastResult'] ?? undefined,
    lastReviewAt: c.last_review_at ? new Date(c.last_review_at).getTime() : undefined,
  }
}

// 用一個穩定的 UUID 對應本地 numeric id（避免 IndexedDB 跟雲端 id 互相干擾）
function uuidFromNumber(n: number): string {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`
}

// ── 簡單的「等 client ready」包裝 ───────────────────────

function getClient() {
  const sb = getSupabase()
  if (!sb) throw new Error('尚未連線 Supabase')
  return sb
}

// ── Profiles ────────────────────────────────────────

export async function pullProfiles(userId: string): Promise<Profile[]> {
  const sb = getClient()
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
  if (error) throw new Error('拉取 profile 失敗：' + error.message)
  return (data as CloudProfile[]).map(profileFromCloud)
}

export async function pushProfile(userId: string, p: Profile): Promise<void> {
  const sb = getClient()
  const { error } = await sb
    .from('profiles')
    .upsert(profileToCloud(p, userId))
  if (error) throw new Error('上傳 profile 失敗：' + error.message)
  // 標記為本地推送，realtime 收到會跳過
  markLocalPushed(p.id)
}

export async function deleteCloudProfile(profileId: string): Promise<void> {
  const sb = getClient()
  // 標記為本地推送（雖然刪除事件也會被過濾，但保險）
  markLocalPushed(profileId)
  const { error } = await sb
    .from('profiles')
    .delete()
    .eq('id', profileId)
  if (error) throw new Error('刪除 profile 失敗：' + error.message)
}

// ── Notes ────────────────────────────────────────

export async function pullNotes(userId: string): Promise<WrongNote[]> {
  const sb = getClient()
  const { data, error } = await sb
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error('拉取 notes 失敗：' + error.message)
  return (data as CloudNote[]).map(noteFromCloud)
}

export async function pushNote(userId: string, n: WrongNote): Promise<void> {
  const sb = getClient()
  const cloud = noteToCloud(n, userId)
  // 標記為本地推送，realtime 收到會跳過
  markLocalPushed(cloud.id)
  const { error } = await sb
    .from('notes')
    .upsert(cloud)
  if (error) throw new Error('上傳 note 失敗：' + error.message)
}

export async function deleteCloudNote(localId: number, userId: string, profileId: string): Promise<void> {
  const sb = getClient()
  // 用 localId 推算 cloud id（uuidFromNumber 規則）→ 標記防止 realtime 迴圈
  markLocalPushed(uuidFromNumber(localId))
  const { error } = await sb
    .from('notes')
    .delete()
    .eq('user_id', userId)
    .eq('profile_id', profileId)
    .eq('local_id', localId)
  if (error) throw new Error('刪除 note 失敗：' + error.message)
}