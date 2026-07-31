// 全域 Profile Context
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Profile } from '../types'
import { getCurrentProfileId, setCurrentProfileId } from '../utils/profile'

interface ProfileContextValue {
  profiles: Profile[]                          // 所有 profile（含 archived）
  activeProfiles: Profile[]                    // 未封存的
  current: Profile | null                      // 目前選中的 profile
  currentId: string | null                     // 目前選中的 profile id
  setCurrentId: (id: string) => void           // 切換
  ready: boolean                               // 是否已完成首次 profile 設定
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const allProfiles = useLiveQuery(() => db.profiles.toArray()) ?? []
  const [currentId, _setCurrentId] = useState<string | null>(() => getCurrentProfileId())

  // 同步 localStorage 寫入
  const setCurrentId = useCallback((id: string) => {
    _setCurrentId(id)
    setCurrentProfileId(id)
  }, [])

  // 如果 currentId 指向不存在的 profile（被刪除/封存），自動 fallback 到第一個 active
  useEffect(() => {
    if (allProfiles.length === 0) return
    if (currentId && allProfiles.some(p => p.id === currentId && !p.archived)) return
    const firstActive = allProfiles.find(p => !p.archived)
    if (firstActive) setCurrentId(firstActive.id)
  }, [allProfiles, currentId, setCurrentId])

  const activeProfiles = useMemo(() => allProfiles.filter(p => !p.archived), [allProfiles])
  const current = useMemo(
    () => allProfiles.find(p => p.id === currentId && !p.archived) ?? null,
    [allProfiles, currentId],
  )

  const ready = activeProfiles.length > 0 && current !== null

  return (
    <ProfileContext.Provider value={{ profiles: allProfiles, activeProfiles, current, currentId, setCurrentId, ready }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}