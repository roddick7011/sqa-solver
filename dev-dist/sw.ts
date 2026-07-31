// MVP placeholder service worker（之後會實作離線快取策略）
self.addEventListener('install', () => {
  // noop
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // 預設 network-first，之後改為 cache-first for shell
  return
})

export {}
