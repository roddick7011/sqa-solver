import { useEffect, useState } from 'react'

const DISMISS_KEY = 'sqa:pwa-prompt-dismissed'

// 偵測是否已在 standalone（PWA 已安裝）
function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         // @ts-expect-error: iOS Safari 專用
         !!window.navigator.standalone
}

// 偵測 iOS Safari
function isIosSafari(): boolean {
  const ua = window.navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua)
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    // 已安裝 → 不顯示
    if (isStandalone()) return
    // 已關閉 → 不顯示
    if (localStorage.getItem(DISMISS_KEY)) return

    if (isIosSafari()) {
      setIsIos(true)
      setVisible(true)
      return
    }

    // Android Chrome：監聽 beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') dismiss()
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 inset-x-2 z-20 max-w-screen-md mx-auto animate-[slideUp_0.3s_ease-out]">
      <div className="card p-3 flex items-start gap-3 border-primary-200 bg-primary-50">
        <img src="/icon-192.png" alt="" className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">📲 加到主畫面</div>
          <div className="text-xs text-slate-600 mt-0.5">
            {isIos
              ? '點「分享 ⤴︎」→ 選「加到主畫面」，下次一點就開！'
              : '點下方��鈕安裝，像 App 一樣一點就開！'}
          </div>
        </div>
        {!isIos && (
          <button onClick={install} className="btn-primary text-xs px-3 py-1.5 flex-shrink-0">安裝</button>
        )}
        <button onClick={dismiss} aria-label="關閉" className="btn-ghost text-base px-2 flex-shrink-0">✕</button>
      </div>
    </div>
  )
}
