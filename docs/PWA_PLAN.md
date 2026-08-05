# PWA 執行計畫（MVP：加到主畫面）

> 狀態：⬜ 待執行 | 上次更新：2026-08-05
> 引用者：HANDOFF.md「待完成項目」→ 本文件

---

## 1. 目標與範圍

### 目標
手機（Android / iOS）能把 APP「加到主畫面」，像原生 App 一樣一鍵開啟、全螢幕、無瀏覽器工具列。

### 明確不做（本階段）
- ❌ **不啟用 Service Worker 離線快取**（2026-08-02 踩過坑：SW cache 舊版 shell → 手機永遠看不到新版。快取策略想清楚之前不碰）
- ❌ 通知推播（需要 SW + 伺服器 push，之後再說）

---

## 2. 現況盤點（2026-08-05 檢查）

| 項目 | 狀態 | 說明 |
|---|---|---|
| `public/manifest.webmanifest` | ✅ 已有 | name/short_name/theme_color/display/start_url |
| `index.html` manifest link | ✅ 已有 | `<link rel="manifest">` |
| theme-color meta | ✅ 已有 | `#6366f1` |
| apple-mobile-web-app meta | ✅ 已有 | capable / status-bar / title |
| **PNG 圖示 192/512** | ❌ 缺 | manifest 目前用 SVG icon（iOS 不吃） |
| **apple-touch-icon** | ❌ 缺 | iOS 加到主畫面需要 PNG |
| **安裝引導 UI** | ❌ 缺 | 使用者不知道能加到主畫面 |
| `public/sw.js.disabled` | ⚠️ 停用中 | 刻意保留（歷史紀錄） |

---

## 3. 執行步驟（估計 1-1.5 小時）

### Step 1：產生 PNG 圖示（30 分鐘）
- 從 `public/favicon.svg` 產生：
  - `icon-192.png`（192×192，含 maskable 安全區）
  - `icon-512.png`（512×512）
  - `apple-touch-icon.png`（180×180，不透明背景）
- 做法：寫個一次性 Node 腳本用 sharp / 或直接用 ImageGen 產生（注意底色要 match `#6366f1`）
- 產物放 `public/`

### Step 2：更新 manifest（5 分鐘）
```json
"icons": [
  { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
  { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
  { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
]
```

### Step 3：index.html 加 iOS 支援（5 分鐘）
```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

### Step 4：安裝引導 UI（30 分鐘）
- **Android Chrome**：監聽 `beforeinstallprompt` 事件 → 顯示「📲 加到主畫面」banner
- **iOS Safari**：偵測 `standalone` display-mode → 顯示「用 Safari 分享 → 加到主畫面」提示
- 放 `Layout.tsx` 底部浮動卡片，可關閉，關閉後存 localStorage 不再顯示
- 不強推：只在首次造訪顯示

### Step 5：驗收（10 分鐘）
見下方驗收清單。

---

## 4. 驗收清單

- [ ] Android Chrome 出現「安裝應用程式」提示或安裝 banner
- [ ] Android 主畫面出現「解題小幫手」圖示，點開全螢幕（無網址列）
- [ ] iOS Safari「分享 → 加到主畫面」，圖示正確（不縮成小方塊）
- [ ] iOS 點開後無瀏覽器工具列（standalone）
- [ ] 圖示在不同解析度不糊（144/180/192/512 至少 4 個尺寸）
- [ ] 離線開啟 → 顯示正常頁面（IndexedDB 資料還在；網路功能報錯但頁面不崩）

---

## 5. 風險與注意事項

### ⚠️ SW 歷史坑（2026-08-02）
- 之前 SW cache 舊 shell → 手機永遠舊版 → 被迫完全移除
- **本計畫不啟用 SW**，只做 manifest + 圖示 + 安裝引導 → 不會再踩
- 若未來要做離線：改用「network-first + 版本化 cache name + 每次更新清舊 cache」策略

### iOS 限制
- iOS **不支援 SVG 圖示** → 必須有 PNG + apple-touch-icon
- iOS 安裝體驗較隱蔽（藏在 Safari 分享選單），引導 UI 要有 iOS 專屬文案

### beforeinstallprompt 注意
- 舊標準事件，Chrome 仍支援，但未來可能移除（2024+ 有支援 Install API 的趨勢）
- 若不顯示也不影響：使用者仍可手動「加到主畫面」

---

## 6. 完成後的後續選項

- [ ] 離線快取（network-first 策略，需謹慎設計）
- [ ] 通知推播（每日複習提醒：「今天有 N 題要複習」）
- [ ] 啟動畫面（splash screen）客製化
