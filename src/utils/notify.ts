// 通知工具：sync 失敗時顯示給使用者
// 不只是 console.warn，讓使用者看得到錯誤

/**
 * 同步失敗時通知使用者
 * - console.warn 留 log
 * - alert 顯示易讀訊息
 */
export function notifySyncError(action: string, error: any) {
  const msg = error?.message ?? error
  console.warn(`[sqa] ${action} 失敗：`, msg)
  alert(
    `⚠️ ${action} 失敗\n\n${msg}\n\n` +
    `請檢查：\n` +
    `1. 設定頁「☁️ 雲端同步」是否已連線\n` +
    `2. 是否已登入 Supabase 帳號\n` +
    `3. 網路是否正常\n\n` +
    `資料已存在本地，斷網用也沒問題，連線後可一鍵補推。`
  )
}

/**
 * 批次操作靜默通知（不 alert 一直跳）
 * 用 setMsg callback 顯示在 UI 訊息區
 */
export function notifyBatchResult(
  setMsg: (s: string) => void,
  action: string,
  ok: number,
  fail: number,
  total: number
) {
  if (fail === 0) {
    setMsg(`✅ ${action} ${ok}/${total} 筆成功`)
  } else {
    setMsg(`⚠️ ${action} ${ok}/${total} 成功，${fail} 失敗（請看 DevTools console 看錯誤）`)
  }
}