// 分享連結基底網域 — 用戶在電腦端設定「手機/平板能訪問的網域」
const SHARE_BASE_URL_KEY = 'sqa:share-base-url'

export function getShareBaseUrl(): string {
  const custom = localStorage.getItem(SHARE_BASE_URL_KEY)
  if (custom) return custom.replace(/\/+$/, '')
  // 預設：用戶的 window.location.origin（自動偵測）
  // 但如果當前是 localhost（電腦 dev），預設沒用，因為手機連不上
  return window.location.origin
}

export function setShareBaseUrl(url: string): void {
  localStorage.setItem(SHARE_BASE_URL_KEY, url.replace(/\/+$/, ''))
}

export function getDefaultShareBaseUrl(): string {
  // 給使用者建議的預設值
  // 1. 自動偵測目前電腦的 IP（透過 RTCPeerConnection）
  // 2. 失敗的話用目前的 origin
  // 3. 最終 fallback 給手動輸入範例
  return window.location.origin
}