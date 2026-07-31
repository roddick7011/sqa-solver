import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_AI_CONFIG, type AIConfig } from '../ai/types'
import { loadAIConfig, makeSolver, saveAIConfig } from '../ai/solver'
import { decodeConfig, encodeConfig } from '../utils/share'
import { db } from '../db/db'
import {
  exportNotesCopy, exportNotesDownload, exportNotesAsString,
  parseBackupFile, importNotesAdd, importNotesReplace,
  getAutoSnapshot, getAutoSnapshotMeta, clearAutoSnapshot,
  formatBytes, formatDate,
} from '../utils/backup'
import { useProfile } from '../contexts/ProfileContext'
import { makeProfile, pickRandomEmoji, PROFILE_EMOJIS } from '../utils/profile'
import { loadSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig, isValidSupabaseUrl, getSupabase } from '../cloud/supabase'
import { getShareBaseUrl, setShareBaseUrl } from '../cloud/share'
import { pushProfile, deleteCloudProfile, pullNotes, pullProfiles, pushNote } from '../cloud/sync'
import { useAuth } from '../contexts/AuthContext'
import { notifySyncError } from '../utils/notify'
import RealtimeStatusPanel from '../components/RealtimeStatusPanel'

type TestStatus =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'ok'; message: string }
  | { kind: 'fail'; message: string }

const CLAUDE_MODELS = [
  'claude-sonnet-4-5',
  'claude-opus-4-1',
  'claude-3-7-sonnet-latest',
  'claude-3-5-sonnet-latest',
  'claude-3-5-haiku-latest',
]

const OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'o1',
  'o1-mini',
]

export default function SettingsPage() {
  const [cfg, setCfg] = useState<AIConfig>(DEFAULT_AI_CONFIG)
  const [saved, setSaved] = useState(false)
  const [test, setTest] = useState<TestStatus>({ kind: 'idle' })
  const [exportText, setExportText] = useState<string>('')
  const [importText, setImportText] = useState<string>('')
  const [importMsg, setImportMsg] = useState<string>('')
  const abortRef = useRef<AbortController | null>(null)

  // 題本備份狀態
  const { current, activeProfiles, profiles, setCurrentId } = useProfile()
  const { user } = useAuth()
  const notes = useLiveQuery(() => db.notes.toArray()) ?? []
  const myNotes = current ? notes.filter(n => n.profileId === current.id) : []
  const autoSnap = getAutoSnapshotMeta()
  const importFileRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<string>('')
  const [showJson, setShowJson] = useState<string>('')  // 完整 JSON modal
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🌱')

  // 云端 Supabase 連線狀態
  const existingCloud = loadSupabaseConfig()
  // 支援從 query string 預填（方便第一次連線）
  const queryUrl = new URLSearchParams(window.location.search).get('supabase_url') ?? ''
  const queryKey = new URLSearchParams(window.location.search).get('supabase_key') ?? ''
  const [cloudUrl, setCloudUrl] = useState(queryUrl || existingCloud?.url || '')
  const [cloudKey, setCloudKey] = useState(queryKey || existingCloud?.anonKey || '')
  const [cloudMsg, setCloudMsg] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [shareBaseUrl, setShareBaseUrlState] = useState(getShareBaseUrl())

  useEffect(() => {
    // 不再每次進入詢問還原；改由使用者主動按「從自動快照還原」按鈕
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setCfg(loadAIConfig())
  }, [])

  function setField<K extends keyof AIConfig>(k: K, v: AIConfig[K]) {
    setCfg(c => ({ ...c, [k]: v }))
  }

  function onSave() {
    saveAIConfig(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  async function onTest() {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setTest({ kind: 'pending' })

    try {
      const solver = makeSolver(cfg)
      const validation = solver.validateConfig()
      if (validation) {
        setTest({ kind: 'fail', message: validation })
        return
      }
      const msg = await solver.testConnection(abortRef.current.signal)
      setTest({ kind: 'ok', message: msg })
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setTest({ kind: 'fail', message: e?.message ?? '連線失敗' })
    }
  }

  function onCancelTest() {
    abortRef.current?.abort()
    setTest({ kind: 'idle' })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">⚙️ AI 設定</h2>

      {/* 雲端同步狀態面板（手機也能看到） */}
      <RealtimeStatusPanel />

      <div className="card p-4 text-sm text-slate-600 space-y-1">
        <div>🔐 <b>API Key 只存在你的瀏覽器</b>，不會上傳到任何伺服器。</div>
        <div>💡 想用本地模型（例如 Ollama）請選「自訂」，把 base URL 填成 <code className="bg-slate-100 px-1 rounded">http://localhost:11434/v1</code>。</div>
      </div>

      <div className="card p-4 space-y-3">
        <div>
          <label className="label">Provider</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['claude', 'Claude'],
              ['openai', 'OpenAI'],
              ['custom', '自訂'],
            ] as const).map(([id, name]) => (
              <button
                key={id}
                onClick={() => setField('provider', id)}
                className={`py-3 rounded-xl text-sm font-medium border ${
                  cfg.provider === id
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">API Key</label>
          <input
            type="password"
            value={cfg.apiKey}
            onChange={e => setField('apiKey', e.target.value)}
            className="input"
            placeholder={cfg.provider === 'custom' ? '本地端可空白' : 'sk-ant-... 或 sk-...'}
            autoComplete="off"
          />
        </div>

        {cfg.provider === 'claude' && (
          <div>
            <label className="label">Claude 模型</label>
            <select
              value={cfg.claudeModel}
              onChange={e => setField('claudeModel', e.target.value)}
              className="input"
            >
              {CLAUDE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}

        {cfg.provider === 'openai' && (
          <div>
            <label className="label">OpenAI 模型</label>
            <select
              value={cfg.openaiModel}
              onChange={e => setField('openaiModel', e.target.value)}
              className="input"
            >
              {OPENAI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}

        {cfg.provider === 'custom' && (
          <>
            <div>
              <label className="label">Base URL（OpenAI 相容 API）</label>
              <input
                type="text"
                value={cfg.customBaseUrl}
                onChange={e => setField('customBaseUrl', e.target.value)}
                className="input"
                placeholder="http://localhost:11434/v1"
              />
            </div>
            <div>
              <label className="label">模型名稱</label>
              <input
                type="text"
                value={cfg.customModel}
                onChange={e => setField('customModel', e.target.value)}
                className="input"
                placeholder="llava, qwen2-vl-7b, ..."
              />
            </div>
            <div className="text-xs text-slate-500">
              常見本地/自架選項：Ollama（<code>llava</code> / <code>llama3.2-vision</code>）、LM Studio、OpenRouter、vLLM、LiteLLM Proxy。
            </div>
          </>
        )}
      </div>

      <button onClick={onSave} className="btn-primary w-full">
        💾 儲存設定
      </button>

      <div className="card p-4 space-y-3">
        <div>
          <div className="font-semibold">📤 匯出設定（給其他裝置用）</div>
          <div className="text-xs text-slate-500 mt-0.5">
            產生一串設定碼，複製後到手機貼上匯入。設定裡含 API Key，請只在「自己的裝置」之間傳。
          </div>
        </div>
        {!exportText ? (
          <button
            onClick={() => setExportText(encodeConfig(cfg))}
            className="btn-secondary w-full text-sm"
          >
            🔑 產生設定碼
          </button>
        ) : (
          <div className="space-y-2">
            <textarea
              readOnly
              value={exportText}
              className="input text-xs font-mono break-all resize-none"
              rows={3}
              onFocus={e => e.currentTarget.select()}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(exportText)
                  } catch {
                    /* fallback 已透過 textarea select 提供 */
                  }
                }}
                className="btn-primary text-sm py-2"
              >
                📋 複製
              </button>
              <button
                onClick={() => setExportText('')}
                className="btn-secondary text-sm py-2"
              >
                收合
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card p-4 space-y-3">
        <div>
          <div className="font-semibold">📥 匯入設定</div>
          <div className="text-xs text-slate-500 mt-0.5">
            從其他裝置複製設定碼貼到這裡，會覆蓋目前設定（記得按「儲存設定」）。
          </div>
        </div>
        <textarea
          value={importText}
          onChange={e => { setImportText(e.target.value); setImportMsg('') }}
          className="input text-xs font-mono break-all resize-none"
          rows={3}
          placeholder="把設定碼貼在這裡..."
        />
        <button
          onClick={() => {
            if (!importText.trim()) {
              setImportMsg('請先貼上設定碼')
              return
            }
            const r = decodeConfig(importText)
            if (!r.ok || !r.config) {
              setImportMsg(`❌ ${r.error ?? '解析失敗'}`)
              return
            }
            setCfg(r.config)
            saveAIConfig(r.config)
            setImportText('')
            setImportMsg('✅ 已匯入並儲存！')
          }}
          className="btn-primary text-sm py-2"
        >
          匯入並儲存
        </button>
        {importMsg && (
          <div className={`text-sm ${importMsg.startsWith('✅') ? 'text-emerald-700' : 'text-rose-700'}`}>
            {importMsg}
          </div>
        )}
      </div>

      {saved && (
        <div className="card p-3 border-emerald-200 bg-emerald-50 text-emerald-700 text-sm text-center">
          ✅ 已儲存
        </div>
      )}

      {/* 題本備份 / 還原 */}
      <div className="card p-4 space-y-3">
        <div>
          <div className="font-semibold">📦 題本備份（{current?.name ?? '目前帳號'}）</div>
          <div className="text-xs text-slate-500 mt-0.5">
            目前 {myNotes.length} 筆錯題（{current?.emoji} {current?.name}）。匯出 JSON 檔可存到 iCloud Drive / Google Drive / NAS 等雲端硬碟，
            然後到另一個裝置匯入即可同步。
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={async () => {
              if (myNotes.length === 0) {
                if (!confirm('目前沒有任何錯題，要匯出空備份嗎？')) return
              }
              setImportStatus('')
              try {
                const r = await exportNotesCopy(myNotes)
                const kb = (r.bytes / 1024).toFixed(1)
                setImportStatus(`📋 已複製到剪貼簿（${kb} KB）。\n請到「記事本 / Google Drive 網頁 / Email 草稿」貼上（⌘/Ctrl+V）並存檔。`)
              } catch (err: any) {
                setImportStatus(`❌ 複製失敗：${err?.message ?? err}`)
              }
            }}
            disabled={myNotes.length === 0}
            className="btn-primary text-sm py-2.5"
          >
            📋 複製
          </button>
          <button
            onClick={() => {
              if (myNotes.length === 0) {
                if (!confirm('目前沒有任何錯題，要顯示空備份嗎？')) return
              }
              const r = exportNotesAsString(myNotes)
              setShowJson(r.json)
            }}
            disabled={myNotes.length === 0}
            className="btn-secondary text-sm py-2.5"
          >
            📄 顯示 JSON
          </button>
          <button
            onClick={async () => {
              if (myNotes.length === 0) {
                if (!confirm('目前沒有任何錯題，要匯出空備份嗎？')) return
              }
              setImportStatus('')
              try {
                const r = await exportNotesDownload(myNotes)
                const kb = (r.bytes / 1024).toFixed(1)
                setImportStatus(`✅ 已下載 ${r.filename}（${kb} KB）\n如未跳出下載視窗，代表目前環境不支援下載，請改用「📋 複製」或「📄 顯示 JSON」。`)
              } catch (err: any) {
                setImportStatus(`❌ 下載失敗：${err?.message ?? err}`)
              }
            }}
            disabled={myNotes.length === 0}
            className="btn-secondary text-sm py-2.5"
          >
            📥 下載
          </button>
        </div>

        <button
          onClick={() => importFileRef.current?.click()}
          className="btn-secondary text-sm py-2.5 w-full"
        >
          📥 匯入 JSON 檔案
        </button>
        <input
          ref={importFileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setImportStatus('讀取檔案中...')
              try {
                const backup = await parseBackupFile(file)
                const strategy = confirm(
                  `備份檔包含 ${backup.notes.length} 筆錯題（${formatDate(backup.exportedAt)}）。\n\n` +
                  `按「確定」= 合併到現有資料\n` +
                  `按「取消」= 取代現有資料（清空後再匯入）`
                )
                if (strategy) {
                  // 合併：保留現有 + 加新的
                  await importNotesAdd(db, backup.notes)
                  setImportStatus(`✅ 已合併 ${backup.notes.length} 筆新錯題`)
                } else {
                  // 取代：清空後匯入
                  if (confirm('確定要清空現有錯題後再匯入嗎？此操作無法復原（除非有自動快照）。')) {
                    await importNotesReplace(db, backup.notes)
                    setImportStatus(`✅ 已清空並匯入 ${backup.notes.length} 筆`)
                  } else {
                    setImportStatus('已取消')
                  }
                }
              } catch (err: any) {
                setImportStatus(`❌ ${err?.message ?? '匯入失敗'}`)
              } finally {
                if (importFileRef.current) importFileRef.current.value = ''
              }
            }}
        />

        {importStatus && (
          <div className={`text-sm ${importStatus.startsWith('✅') ? 'text-emerald-700' : importStatus.startsWith('❌') ? 'text-rose-700' : 'text-slate-600'}`}>
            {importStatus}
          </div>
        )}

        {/* 自動快照狀態 */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
          <div className="font-semibold text-slate-700">🛡️ 自動快照</div>
          {autoSnap ? (
            <>
              <div className="text-slate-600">
                上次備份：{formatDate(autoSnap.savedAt)} · {autoSnap.noteCount} 筆 · {formatBytes(autoSnap.size)}
              </div>
              <div className="text-slate-500">
                存在瀏覽器 localStorage 中。即使 IndexedDB 被清，下次進入本頁時會詢問是否還原。
              </div>
              <button
                onClick={async () => {
                  if (!confirm(`確定要從自動快照還原嗎？\n會把 ${autoSnap.noteCount} 筆加進「${current?.name ?? '目前帳號'}」profile。`)) return
                  const snap = getAutoSnapshot()
                  if (!snap) return
                  // 加上目前 profileId，避免還原到錯誤帳號
                  const notesWithProfile = snap.notes.map(n => ({
                    ...n,
                    profileId: n.profileId || current?.id || 'default',
                  }))
                  await importNotesAdd(db, notesWithProfile)
                  clearAutoSnapshot()
                  alert(`已還原 ${snap.notes.length} 筆錯題`)
                }}
                className="text-primary-600 text-xs mt-1 mr-3"
              >
                ↺ 從快照還原到 {current?.name ?? '目前帳號'}
              </button>
              <button
                onClick={() => {
                  if (confirm('確定要清除自動快照嗎？')) {
                    clearAutoSnapshot()
                    alert('已清除，下次重整頁面後生效')
                  }
                }}
                className="text-rose-600 text-xs mt-1"
              >
                清除自動快照
              </button>
            </>
          ) : (
            <div className="text-slate-500">尚無自動快照。新增/修改錯題時會自動建立。</div>
          )}
        </div>

        <div className="text-xs text-slate-500 leading-relaxed">
          💡 <b>跨裝置同步流程：</b><br />
          ① 在電腦匯出 → ② 把 JSON 存到 iCloud Drive / Google Drive / Dropbox / NAS 資料夾 →<br />
          ③ 在手機從雲端下載該檔 → ④ 在本頁點「匯入 JSON」即可。
        </div>
      </div>

      {/* 雲端同步（Supabase） */}
      <div className="card p-4 space-y-3">
        <div>
          <div className="font-semibold">☁️ 雲端同步（Supabase）</div>
          <div className="text-xs text-slate-500 mt-0.5">
            連線後，錯題會自動同步到雲端，跨裝置都能存取。
            還沒申請？參考專案 <code className="bg-slate-100 px-1 rounded">supabase/README.md</code> 步驟指南。
          </div>
        </div>

        {/* 分享連結網域設定 */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
          <div className="text-xs font-semibold text-slate-700">🌐 分享連結網域（手機無法連 localhost）</div>
          <div className="text-xs text-slate-500">
            複製「其他裝置設定」連結時，會用這個網域。目前自動偵測為：
            <code className="bg-white px-1 rounded ml-1">{window.location.origin}</code>
          </div>
          <div className="text-xs text-slate-500">
            如果手機 / 平板要連線，請改成電腦的內網 IP，例如：
            <code className="bg-white px-1 rounded ml-1">http://192.168.2.87:5173</code>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareBaseUrl}
              onChange={e => setShareBaseUrlState(e.target.value)}
              className="input flex-1 font-mono text-xs"
              placeholder="http://192.168.2.87:5173"
            />
            <button
              onClick={() => {
                setShareBaseUrl(shareBaseUrl)
                setCloudMsg(`✅ 分享網域已儲存為 ${shareBaseUrl}`)
              }}
              className="btn-secondary text-xs py-2 px-3"
            >
              💾 儲存
            </button>
          </div>
        </div>

        {existingCloud ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs space-y-2">
            <div className="text-emerald-700 font-medium">✅ 已連線</div>
            <div className="text-slate-600 font-mono break-all">{existingCloud.url}</div>
                <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={async () => {
                  const shareUrl = `${shareBaseUrl}/settings?supabase_url=${encodeURIComponent(existingCloud.url)}&supabase_key=${encodeURIComponent(existingCloud.anonKey)}`
                  try {
                    await navigator.clipboard.writeText(shareUrl)
                    setCloudMsg(`📱 已複製「其他裝置設定」連結，貼到手機 / 平板 / 另一個瀏覽器，開啟後會自動帶入並連線。\n連結網域：${shareBaseUrl}`)
                  } catch {
                    setCloudMsg('❌ 剪貼簿失敗，請改用「📄 顯示連結」按鈕')
                    setShareUrl(shareUrl)
                  }
                }}
                className="text-primary-600 text-xs"
              >
                📱 複製「其他裝置設定」連結
              </button>
              <span className="text-slate-400">·</span>
              <button
                onClick={() => {
                  const shareUrl = `${shareBaseUrl}/settings?supabase_url=${encodeURIComponent(existingCloud.url)}&supabase_key=${encodeURIComponent(existingCloud.anonKey)}`
                  setShareUrl(shareUrl)
                }}
                className="text-slate-600 text-xs"
              >
                📄 顯示連結
              </button>
              <span className="text-slate-400">·</span>
              <button
                onClick={() => {
                  if (confirm('確定要斷開雲端連線？雲端資料不會被刪，但 APP 會停在本地資料。')) {
                    clearSupabaseConfig()
                    setCloudUrl('')
                    setCloudKey('')
                    setCloudMsg('已斷開連線')
                  }
                }}
                className="text-rose-600 text-xs"
              >
                🗑️ 斷開連線
              </button>
            </div>

            {/* 推送所有本地資料到雲端（測試用） */}
            <div className="pt-2 border-t border-emerald-200">
              <button
                onClick={async () => {
                  if (!user) {
                    setCloudMsg('❌ 請先登入才能推送')
                    return
                  }
                  setCloudMsg('📤 推送所有本地資料到雲端中…')
                  try {
                    const userId = user.id
                    const profiles = await db.profiles.toArray()
                    const notes = await db.notes.toArray()
                    let pOk = 0, pFail = 0, nOk = 0, nFail = 0
                    for (const p of profiles) {
                      try {
                        await pushProfile(userId, p)
                        pOk++
                      } catch (e) {
                        pFail++
                        console.warn('[sqa] 推送 profile 失敗：', p.name, e)
                      }
                    }
                    for (const n of notes) {
                      try {
                        await pushNote(userId, n)
                        nOk++
                      } catch (e: any) {
                        nFail++
                        console.warn('[sqa] 推送 note 失敗：', n.id, e?.message)
                      }
                    }
                    if (pFail === 0 && nFail === 0) {
                      setCloudMsg(`✅ 推送完成！profile: ${pOk} / ${profiles.length}、note: ${nOk} / ${notes.length} 都成功`)
                    } else {
                      setCloudMsg(`⚠️ 推送部分失敗！profile: ${pOk} 成功 / ${pFail} 失敗，note: ${nOk} 成功 / ${nFail} 失敗\n請看 DevTools Console 看錯誤訊息`)
                    }
                  } catch (e: any) {
                    setCloudMsg(`❌ 推送失敗：${e?.message ?? e}`)
                  }
                }}
                className="btn-secondary text-sm py-2 w-full"
              >
                📤 推送所有本地資料到雲端（測試用）
              </button>
            </div>

            {/* 從雲端重新拉取（測試用） */}
            <div className="pt-2 border-t border-emerald-200">
              <button
                onClick={async () => {
                  if (!user) {
                    setCloudMsg('❌ 請先登入才能從雲端拉取')
                    return
                  }
                  if (!confirm('🔄 從雲端重新拉取會清空本地所有 profiles / notes，再用雲端資料重建。確定要執行？（測試用）')) return
                  setCloudMsg('🔄 從雲端拉取中…')
                  try {
                    const userId = user.id
                    const [cloudProfiles, cloudNotes] = await Promise.all([
                      pullProfiles(userId),
                      pullNotes(userId),
                    ])
                    await db.transaction('rw', db.profiles, db.notes, async () => {
                      await db.profiles.clear()
                      await db.notes.clear()
                      for (const p of cloudProfiles) await db.profiles.put(p)
                      for (const n of cloudNotes) {
                        const dup = await db.notes
                          .where('profileId').equals(n.profileId)
                          .filter(x => x.createdAt === n.createdAt)
                          .first()
                        if (!dup) await db.notes.add(n)
                      }
                    })
                    setCloudMsg(`✅ 拉取完成！${cloudProfiles.length} 個 profile、${cloudNotes.length} 筆 note`)
                  } catch (e: any) {
                    setCloudMsg(`❌ 拉取失敗：${e?.message ?? e}`)
                  }
                }}
                className="btn-secondary text-sm py-2 w-full"
              >
                🔄 從雲端重新拉取（測試用）
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="label">Supabase Project URL</label>
              <input
                type="text"
                value={cloudUrl}
                onChange={e => setCloudUrl(e.target.value)}
                className="input font-mono text-xs"
                placeholder="https://xxxxx.supabase.co"
              />
            </div>
            <div>
              <label className="label">anon public key</label>
              <input
                type="text"
                value={cloudKey}
                onChange={e => setCloudKey(e.target.value)}
                className="input font-mono text-xs"
                placeholder="eyJhbGciOi..."
              />
            </div>
            <button
              onClick={async () => {
                if (!isValidSupabaseUrl(cloudUrl)) {
                  setCloudMsg('❌ URL 格式不對，應為 https://xxxxx.supabase.co')
                  return
                }
                if (!cloudKey.trim() || cloudKey.length < 50) {
                  setCloudMsg('❌ anon key 看起來不對（應為超過 100 字元的 JWT）')
                  return
                }
                try {
                  saveSupabaseConfig({ url: cloudUrl.trim(), anonKey: cloudKey.trim() })
                  setCloudMsg('✅ 已儲存！重新整理頁面後生效。')
                } catch (e: any) {
                  setCloudMsg('❌ 儲存失敗：' + (e?.message ?? e))
                }
              }}
              className="btn-primary text-sm py-2 w-full"
            >
              💾 儲存並連線
            </button>
            <button
              onClick={async () => {
                setCloudMsg('🔌 測試連線中…')
                try {
                  const sb = getSupabase()
                  if (!sb) throw new Error('尚未連線，請先按「💾 儲存並連線」')
                  const { data, error } = await sb.auth.getSession()
                  if (error) throw error
                  setCloudMsg(`✅ 連線成功！Supabase 已連線（${data.session ? '已登入' : '尚未登入'}）`)
                } catch (e: any) {
                  setCloudMsg(`❌ 連線失敗：${e?.message ?? e}`)
                }
              }}
              className="btn-secondary text-sm py-2 w-full"
            >
              🔌 測試連線
            </button>
            <p className="text-xs text-slate-500">
              ⚠️ 雲端同步功能尚未啟用帳號 UI。儲存後需等開發完成登入畫面才能正式使用。
            </p>
          </>
        )}
        {cloudMsg && (
          <div className={`text-xs ${cloudMsg.startsWith('✅') ? 'text-emerald-700' : cloudMsg.startsWith('❌') ? 'text-rose-700' : 'text-slate-600'}`}>
            {cloudMsg}
          </div>
        )}
      </div>

      {/* 帳號（小孩）管理 */}
      <div className="card p-4 space-y-3">
        <div>
          <div className="font-semibold">👶 帳號（小孩）</div>
          <div className="text-xs text-slate-500 mt-0.5">
            目前使用：{current?.emoji} {current?.name}（{myNotes.length} 筆錯題）
          </div>
        </div>

        {/* 現有帳號列表 */}
        <div className="space-y-1.5">
          {activeProfiles.map(p => (
            <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
              <span className="text-2xl">{p.emoji}</span>
              <span className="flex-1 font-medium">{p.name}</span>
              {p.id === current?.id && (
                <span className="text-xs text-primary-600 font-medium">目前</span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (p.id !== current?.id) setCurrentId(p.id)
                }}
                disabled={p.id === current?.id}
                className="btn-ghost text-xs py-1 px-2"
              >
                切換
              </button>
              <button
                type="button"
                onClick={async () => {
                  const newName = prompt(`重新命名 ${p.name}`, p.name)
                  if (!newName || newName.trim() === p.name) return
                  await db.profiles.update(p.id, { name: newName.trim() })
                  // 同步到雲端
                  if (user) {
                    const updated = await db.profiles.get(p.id)
                    if (updated) {
                      try { await pushProfile(user.id, updated) } catch (e: any) {
                        notifySyncError('同步改名到雲端', e)
                      }
                    }
                  }
                }}
                className="btn-ghost text-xs py-1 px-2"
                title="重新命名"
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`確定要刪除 ${p.name}？所有錯題也會一併刪除，無法復原！`)) return
                  // 刪除該 profile 的所有 notes 和 profile 本身
                  await db.notes.where('profileId').equals(p.id).delete()
                  await db.profiles.delete(p.id)
                  // 同步刪除雲端（先用 notesId 為對應雲端的 id）
                  if (user) {
                    try { await deleteCloudProfile(p.id) } catch (e: any) {
                      notifySyncError('從雲端刪除 profile', e)
                    }
                  }
                }}
                className="btn-ghost text-xs py-1 px-2 text-rose-600"
                title="刪除"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        {/* 新增帳號 */}
        <details className="border border-slate-200 rounded-lg">
          <summary className="cursor-pointer p-3 text-sm font-medium text-slate-700">+ 新增帳號</summary>
          <div className="p-3 border-t border-slate-100 space-y-3">
            <div>
              <label className="label">名字</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="input"
                placeholder="例如：小華"
              />
            </div>
            <div>
              <label className="label">頭像</label>
              <div className="flex flex-wrap gap-1.5">
                {PROFILE_EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setNewEmoji(e)}
                    className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center border transition-all ${
                      newEmoji === e ? 'bg-primary-100 border-primary-500' : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {e}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setNewEmoji(pickRandomEmoji())}
                  className="w-9 h-9 rounded-lg text-sm flex items-center justify-center border border-slate-200 hover:bg-slate-50"
                  title="隨機"
                >
                  🎲
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!newName.trim()) return
                const p = makeProfile(newName, newEmoji)
                await db.profiles.put(p)
                // 同步到雲端
                if (user) {
                  try { await pushProfile(user.id, p) } catch (e: any) {
                    notifySyncError('同步新帳號到雲端', e)
                  }
                }
                setCurrentId(p.id)
                setNewName('')
                setNewEmoji('🌱')
              }}
              disabled={!newName.trim()}
              className="btn-primary text-sm py-2 w-full"
            >
              建立帳號
            </button>
          </div>
        </details>
      </div>

      {/* JSON 完整內容 modal — 任何環境都能用（textarea 手動複製） */}
      {showJson && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowJson('')}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <div className="font-semibold">📄 完整 JSON</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  按 ⌘/Ctrl+A 全選 → ⌘/Ctrl+C 複製 → 貼到記事本 / Google Drive / Email，存成 .json 檔
                </div>
              </div>
              <button onClick={() => setShowJson('')} className="btn-ghost text-sm">✕</button>
            </div>
            <textarea
              readOnly
              value={showJson}
              onFocus={e => e.currentTarget.select()}
              className="flex-1 p-4 font-mono text-xs resize-none focus:outline-none"
              style={{ minHeight: 300 }}
            />
            <div className="p-3 border-t flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(showJson)
                    alert('已複製到剪貼簿')
                  } catch {
                    alert('剪貼簿 API 失敗，請用 ⌘/Ctrl+A 全選後 ⌘/Ctrl+C')
                  }
                }}
                className="btn-primary text-sm py-2 flex-1"
              >
                📋 嘗試複製
              </button>
              <button onClick={() => setShowJson('')} className="btn-secondary text-sm py-2">關閉</button>
            </div>
          </div>
        </div>
      )}

      {/* 共享設定連結 modal */}
      {shareUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShareUrl('')}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="font-semibold mb-2">📱 其他裝置設定連結</div>
            <div className="text-xs text-slate-500 mb-3">
              把這個連結貼到手機 / 平板 / 另一個瀏覽器，開啟後會自動帶入 Supabase 連線設定。
              <br/>
              ⚠️ 連結含 anon key，等同公開密碼，請只用於自己裝置；不要貼到公開論壇。
            </div>
            <textarea
              readOnly
              value={shareUrl}
              onFocus={e => e.currentTarget.select()}
              className="w-full h-24 p-2 font-mono text-xs border border-slate-200 rounded-lg resize-none focus:outline-none"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl)
                    alert('已複製')
                  } catch {
                    alert('剪貼簿失敗，請手動 ⌘/Ctrl+A 全選後 ⌘/Ctrl+C')
                  }
                }}
                className="btn-primary text-sm py-2 flex-1"
              >
                📋 嘗試複製
              </button>
              <button onClick={() => setShareUrl('')} className="btn-secondary text-sm py-2">關閉</button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">🔌 測試連線</div>
            <div className="text-xs text-slate-500 mt-0.5">用目前設定（未儲存也會測試）發一個最小請求</div>
          </div>
          {test.kind === 'pending' ? (
            <button onClick={onCancelTest} className="btn-secondary text-sm py-2 px-4">取消</button>
          ) : (
            <button onClick={onTest} className="btn-primary text-sm py-2 px-4">▶ 測試</button>
          )}
        </div>

        {test.kind === 'pending' && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="inline-block w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            測試中...
          </div>
        )}
        {test.kind === 'ok' && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3">
            ✅ {test.message}
          </div>
        )}
        {test.kind === 'fail' && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3 break-words">
            ❌ {test.message}
          </div>
        )}
      </div>

      <div className="card p-4 text-xs text-slate-500 space-y-2">
        <div className="font-semibold text-slate-700">關於這個 APP</div>
        <div>版本 0.1.0 MVP</div>
        <div>儲存：IndexedDB（離線可用）</div>
        <div>框架：React + Vite + Tailwind</div>
      </div>
    </div>
  )
}
