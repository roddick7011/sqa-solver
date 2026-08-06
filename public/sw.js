// 最小 Service Worker — 只為滿足 Chrome 安裝條件
// 刻意「不 cache 任何資源」：fetch 事件完全旁路，永遠走網路
// 避免 2026-08-02 的舊版快取問題（手機永遠看到舊版）

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  // 清掉任何舊 cache（就算之前有 cache 也確保移除）
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  )
  self.clients.claim()
})

// 不攔截 fetch：所有請求直接走網路
self.addEventListener('fetch', () => {
  // 刻意留空
})
