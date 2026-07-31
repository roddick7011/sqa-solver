// Supabase Realtime 訂閱
// 雲端資料變更即時推送到本地
// 用「最近推送過的 id」清單避免本地寫入 → realtime 回收到自己 → 又寫一次的迴圈
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase } from './supabase'

const LOCAL_PUSH_TTL = 5_000  // 5 秒內忽略同 id 的 realtime 事件
const recentLocalPushIds = new Map<string, number>()

/** 標記「我剛剛推送到雲端的 id」，5 秒內忽略該 id 的 realtime 事件 */
export function markLocalPushed(id: string) {
  recentLocalPushIds.set(id, Date.now())
}

function isRecentLocalPush(id: string): boolean {
  const t = recentLocalPushIds.get(id)
  if (!t) return false
  if (Date.now() - t > LOCAL_PUSH_TTL) {
    recentLocalPushIds.delete(id)
    return false
  }
  return true
}

/** 清空全部（測試用） */
export function clearLocalPushMarks() {
  recentLocalPushIds.clear()
}

export interface RealtimeHandlers {
  onNoteUpsert: (cloud: any) => void | Promise<void>
  onNoteDelete: (cloudId: string) => void | Promise<void>
  onProfileUpsert: (cloud: any) => void | Promise<void>
  onProfileDelete: (cloudId: string) => void | Promise<void>
  onStatusChange?: (status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED') => void
}

/**
 * 訂閱目前 user 的 profiles + notes 變更
 * 回傳 RealtimeChannel，可在卸載時呼叫 removeChannel
 */
export function subscribeToChanges(
  userId: string,
  handlers: RealtimeHandlers,
): RealtimeChannel | null {
  const sb = getSupabase()
  if (!sb) {
    console.warn('[sqa] realtime: Supabase 未連線')
    return null
  }

  const channel = sb
    .channel(`sqa-changes-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notes', filter: `user_id=eq.${userId}` },
      async (payload) => {
        if (isRecentLocalPush(payload.new.id)) return
        await handlers.onNoteUpsert(payload.new)
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'notes', filter: `user_id=eq.${userId}` },
      async (payload) => {
        if (isRecentLocalPush(payload.new.id)) return
        await handlers.onNoteUpsert(payload.new)
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'notes', filter: `user_id=eq.${userId}` },
      async (payload) => {
        const id = payload.old?.id
        if (!id) return
        if (isRecentLocalPush(id)) return
        await handlers.onNoteDelete(id)
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` },
      async (payload) => {
        if (isRecentLocalPush(payload.new.id)) return
        await handlers.onProfileUpsert(payload.new)
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` },
      async (payload) => {
        if (isRecentLocalPush(payload.new.id)) return
        await handlers.onProfileUpsert(payload.new)
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` },
      async (payload) => {
        const id = payload.old?.id
        if (!id) return
        if (isRecentLocalPush(id)) return
        await handlers.onProfileDelete(id)
      }
    )
    .subscribe((status) => {
      console.info('[sqa] realtime status:', status)
      handlers.onStatusChange?.(status as any)
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.warn('[sqa] realtime 連線異常：', status)
      }
    })

  return channel
}

/** 取消訂閱 */
export async function unsubscribeFromChanges(channel: RealtimeChannel | null) {
  if (!channel) return
  const sb = getSupabase()
  if (!sb) return
  await sb.removeChannel(channel)
}