// 題本備份 / 還原工具
import type { WrongNote } from '../types'
import type { NotesDB } from '../db/db'
import { INITIAL_EASE } from './srs'

const BACKUP_VERSION = 1
const AUTO_SNAPSHOT_KEY = 'sqa:auto-snapshot'

export interface BackupFile {
  version: number
  exportedAt: number
  appName: string
  notes: WrongNote[]
}

/**
 * 匯出 JSON 備份 — 強制走下載流程（可能會被 iframe 攔截變 navigation）
 */
export async function exportNotesDownload(notes: WrongNote[]): Promise<{ filename: string; bytes: number }> {
  const data = makeBackupData(notes)
  const json = JSON.stringify(data, null, 2)
  const filename = makeFilename()

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { filename, bytes: json.length }
}

/**
 * 匯出 JSON 備份 — 強制複製到剪貼簿（iframe / preview 環境首選）
 */
export async function exportNotesCopy(notes: WrongNote[]): Promise<{ filename: string; bytes: number }> {
  const data = makeBackupData(notes)
  const json = JSON.stringify(data, null, 2)
  const filename = makeFilename()

  if (!navigator.clipboard?.writeText) {
    throw new Error('此瀏覽器不支援剪貼簿 API，請改用「📄 顯示 JSON」按鈕')
  }
  await navigator.clipboard.writeText(json)
  return { filename, bytes: json.length }
}

/**
 * 取得 JSON 字串（給 UI 自己顯示）
 */
export function exportNotesAsString(notes: WrongNote[]): { json: string; filename: string; bytes: number } {
  const data = makeBackupData(notes)
  const json = JSON.stringify(data, null, 2)
  return { json, filename: makeFilename(), bytes: json.length }
}

function makeBackupData(notes: WrongNote[]): BackupFile {
  return {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    appName: '解題小幫手 SQA',
    notes,
  }
}

function makeFilename(): string {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return `sqa-backup-${yyyy}${mm}${dd}.json`
}

/** 解析使用者選擇的檔案 */
export function parseBackupFile(file: File): Promise<BackupFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = reader.result as string
        const parsed = JSON.parse(text)
        if (!parsed || typeof parsed !== 'object') throw new Error('檔案格式不正確')
        if (!Array.isArray(parsed.notes)) throw new Error('缺少 notes 陣列')
        if (parsed.version !== BACKUP_VERSION) {
          throw new Error(`不支援的備份版本：${parsed.version}`)
        }
        // 補齊 SRS 欄位（防舊備份缺欄位）
        const notes: WrongNote[] = parsed.notes.map((n: any) => ({
          createdAt: n.createdAt ?? Date.now(),
          stage: n.stage,
          grade: n.grade,
          subjectId: n.subjectId,
          questionText: n.questionText ?? '',
          questionImage: n.questionImage,
          aiSolution: n.aiSolution ?? '',
          cues: n.cues ?? '',
          notes: n.notes ?? '',
          summary: n.summary ?? '',
          tags: Array.isArray(n.tags) ? n.tags : [],
          starred: !!n.starred,
          reviewCount: n.reviewCount ?? 0,
          intervalDays: n.intervalDays ?? 0,
          easeFactor: n.easeFactor ?? INITIAL_EASE,
          nextReviewAt: n.nextReviewAt ?? (n.createdAt ?? Date.now()),
          lastResult: n.lastResult,
          lastReviewAt: n.lastReviewAt,
        }))
        resolve({
          version: BACKUP_VERSION,
          exportedAt: parsed.exportedAt ?? Date.now(),
          appName: parsed.appName ?? 'unknown',
          notes,
        })
      } catch (e: any) {
        reject(new Error(`解析失敗：${e?.message ?? e}`))
      }
    }
    reader.onerror = () => reject(new Error('讀檔失敗'))
    reader.readAsText(file, 'utf-8')
  })
}

// ─── 合併 / 取代邏輯 ───────────────────────────────────────

export interface MergeResult {
  added: number
  kept: number
}

/** 把 incoming notes 全部加進 db（不做 id 衝突合併，純新增） */
export async function importNotesAdd(db: NotesDB, incoming: WrongNote[]): Promise<MergeResult> {
  let added = 0
  const existing = await db.notes.count()
  for (const n of incoming) {
    const { id: _id, ...rest } = n as WrongNote & { id?: number }
    await db.notes.add(rest)
    added++
  }
  return { added, kept: existing }
}

/** 清空 db 後再匯入 */
export async function importNotesReplace(db: NotesDB, incoming: WrongNote[]): Promise<MergeResult> {
  await db.notes.clear()
  let added = 0
  for (const n of incoming) {
    const { id: _id, ...rest } = n as WrongNote & { id?: number }
    await db.notes.add(rest)
    added++
  }
  return { added, kept: 0 }
}

// ─── 自動快照（localStorage）──────────────────────────────────────

interface SnapshotMeta {
  savedAt: number
  noteCount: number
  size: number
}

export function saveAutoSnapshot(notes: WrongNote[]): void {
  try {
    const data: BackupFile = {
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      appName: '解題小幫手 SQA (auto)',
      notes,
    }
    const json = JSON.stringify(data)
    localStorage.setItem(AUTO_SNAPSHOT_KEY, json)
    const meta: SnapshotMeta = {
      savedAt: Date.now(),
      noteCount: notes.length,
      size: json.length,
    }
    localStorage.setItem(AUTO_SNAPSHOT_KEY + ':meta', JSON.stringify(meta))
  } catch (e) {
    // localStorage 可能滿了（>5MB 因為 image base64），靜默失敗
    console.warn('[sqa] 自動快照失敗', e)
  }
}

export function getAutoSnapshot(): BackupFile | null {
  try {
    const raw = localStorage.getItem(AUTO_SNAPSHOT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.notes)) return null
    return parsed
  } catch {
    return null
  }
}

export function getAutoSnapshotMeta(): SnapshotMeta | null {
  try {
    const raw = localStorage.getItem(AUTO_SNAPSHOT_KEY + ':meta')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearAutoSnapshot(): void {
  localStorage.removeItem(AUTO_SNAPSHOT_KEY)
  localStorage.removeItem(AUTO_SNAPSHOT_KEY + ':meta')
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

export function formatDate(t: number): string {
  const d = new Date(t)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}
