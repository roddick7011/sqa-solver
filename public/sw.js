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

// 不 cache，但用 event.respondWith 包起來讓 Chrome 認為 SW 有實質處理
// （EMPTY_FETCH_HANDLER 不算 PWA，Chrome 不會觸發安裝 banner）
// 行為仍等同每次走網路，沒 cache 就不會有 08-02 舊版問題
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
