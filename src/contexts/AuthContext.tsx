// Auth Context — 雲端帳號狀態
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase } from '../cloud/supabase'
import { pullNotes, pullProfiles } from '../cloud/sync'
import { noteFromCloud, profileFromCloud } from '../cloud/sync'
import { subscribeToChanges, unsubscribeFromChanges } from '../cloud/realtime'
import { db } from '../db/db'
import type { WrongNote } from '../types'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean               // 初始載入中
  syncing: boolean               // 登入後從雲端拉取中
  realtimeStatus: 'connecting' | 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'offline'
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState<AuthContextValue['realtimeStatus']>('offline')

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) {
      setLoading(false)
      return
    }
    // 取得當前 session
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    }).catch(() => setLoading(false))

    // 訂閱 auth 變化（自動登入/登出）
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 登入後自動拉取雲端資料
  useEffect(() => {
    if (!user || !session) return
    let cancelled = false
    ;(async () => {
      setSyncing(true)
      try {
        const userId = user.id
        const [cloudProfiles, cloudNotes] = await Promise.all([
          pullProfiles(userId),
          pullNotes(userId),
        ])
        if (cancelled) return
        // 合併策略：本地保留 + 雲端新增
        await db.transaction('rw', db.profiles, db.notes, async () => {
          // Profiles：雲端為主，相同 id 直接覆蓋（讓雲端的 name/emoji 更新生效）
          for (const p of cloudProfiles) {
            await db.profiles.put(p)
          }
          // Notes：用 (profileId, createdAt) 當 dedupe key
          // 雲端優先：找到同 (profileId, createdAt) 就更新本地，找不到就新增
          const localNotes = await db.notes.toArray()
          const localByKey = new Map<string, WrongNote>()
          for (const ln of localNotes) {
            localByKey.set(`${ln.profileId}|${ln.createdAt}`, ln)
          }
          for (const n of cloudNotes) {
            const key = `${n.profileId}|${n.createdAt}`
            const existing = localByKey.get(key)
            if (existing && existing.id != null) {
              // 用 put 覆蓋（保留本地 IndexedDB id，合併雲端資料）
              await db.notes.put({ ...n, id: existing.id })
            } else {
              await db.notes.add(n)
            }
          }
        })
        console.info('[sqa] 拉取雲端完成：', cloudProfiles.length, 'profiles,', cloudNotes.length, 'notes')
      } catch (e: any) {
        console.error('[sqa] 拉取雲端失敗：', e?.message ?? e)
      } finally {
        if (!cancelled) setSyncing(false)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id, session])

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = getSupabase()
    if (!sb) return { error: '尚未連線 Supabase（請到設定頁填入 URL 和 Key）' }
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      return { error: error?.message ?? null }
    } catch (e: any) {
      // 顯示完整錯誤（含 name + message），方便 Android 手機端 debug
      const detail = e?.message ?? String(e)
      const name = e?.name ?? 'Error'
      return { error: `${name}: ${detail}` }
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const sb = getSupabase()
    if (!sb) return { error: '尚未連線 Supabase' }
    const { error } = await sb.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    const sb = getSupabase()
    if (!sb) return
    await sb.auth.signOut()
  }, [])

  // 登入後訂閱 Realtime（雲端變更即時同步到本地）
  useEffect(() => {
    if (!user) return
    setRealtimeStatus('connecting')
    const channel = subscribeToChanges(user.id, {
      onNoteUpsert: async (cloud: any) => {
        const note = noteFromCloud(cloud)
        const existing = await db.notes
          .filter(n => n.profileId === note.profileId && n.createdAt === note.createdAt)
          .first()
        if (existing && existing.id != null) {
          await db.notes.put({ ...note, id: existing.id })
        } else {
          await db.notes.add(note)
        }
      },
      onNoteDelete: async (cloudId: string) => {
        // 從 cloudId 推算本地 id（uuidFromNumber 規則）
        const localNotes = await db.notes.toArray()
        for (const n of localNotes) {
          if (n.id != null && uuidFromNumber(n.id) === cloudId) {
            await db.notes.delete(n.id)
            break
          }
        }
      },
      onProfileUpsert: async (cloud: any) => {
        const profile = profileFromCloud(cloud)
        await db.profiles.put(profile)
      },
      onProfileDelete: async (cloudId: string) => {
        await db.profiles.delete(cloudId)
      },
      onStatusChange: (status) => {
        setRealtimeStatus(status)
      },
    })
    return () => {
      unsubscribeFromChanges(channel)
      setRealtimeStatus('offline')
    }
  }, [user?.id])

  return (
    <AuthContext.Provider value={{ user, session, loading, syncing, realtimeStatus, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// 從 numeric id 推算 cloud id（sync.ts 內 uuidFromNumber 規則）
function uuidFromNumber(n: number): string {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`
}