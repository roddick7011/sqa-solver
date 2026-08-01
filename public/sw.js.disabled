// MVP 簡易 service worker：cache shell + runtime cache 圖片
const CACHE = 'sqa-v2'
const SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // 同源：cache-first for shell, network-first for 其他
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req)
      if (cached) return cached
      try {
        const res = await fetch(req)
        if (res.ok && (res.type === 'basic' || res.type === 'default')) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(req, clone))
        }
        return res
      } catch {
        return caches.match('/index.html') as Promise<Response>
      }
    })())
  }
})
