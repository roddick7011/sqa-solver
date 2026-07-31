// Dexie 資料層
import Dexie, { type Table } from 'dexie'
import type { Profile, WrongNote } from '../types'
import { INITIAL_EASE } from '../utils/srs'

export class NotesDB extends Dexie {
  notes!: Table<WrongNote, number>
  profiles!: Table<Profile, string>

  constructor() {
    super('student-qa-db')

    // v1：基本欄位
    this.version(1).stores({
      notes: '++id, createdAt, stage, grade, subjectId, starred',
    })

    // v2：加 SRS 複習狀態
    this.version(2)
      .stores({
        notes: '++id, createdAt, stage, grade, subjectId, starred, nextReviewAt',
      })
      .upgrade(async tx => {
        await tx
          .table('notes')
          .toCollection()
          .modify(n => {
            if (n.nextReviewAt == null) n.nextReviewAt = n.createdAt ?? Date.now()
            if (n.reviewCount == null) n.reviewCount = 0
            if (n.intervalDays == null) n.intervalDays = 0
            if (n.easeFactor == null) n.easeFactor = INITIAL_EASE
          })
      })

    // v3：加 profiles table，notes 加 profileId
    this.version(3)
      .stores({
        profiles: 'id, createdAt',
        notes: '++id, profileId, createdAt, stage, grade, subjectId, starred, nextReviewAt',
      })
      .upgrade(async tx => {
        // 自動建立「預設」profile 並把舊 notes 綁給它
        const defaultId = 'default'
        const defaultProfile: Profile = {
          id: defaultId,
          name: '原來的資料',
          emoji: '📦',
          createdAt: Date.now(),
        }
        await tx.table('profiles').put(defaultProfile)
        await tx
          .table('notes')
          .toCollection()
          .modify(n => {
            if (n.profileId == null) n.profileId = defaultId
          })
      })
  }
}

export const db = new NotesDB()