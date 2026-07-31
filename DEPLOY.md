# 部署指南

讓使用者從「localhost 才能用」變成「全世界能訪問」。

## 推薦方案：Vercel（推薦）

- ✅ 免費且對 Vite + React 完美支援
- ✅ 自動 HTTPS（含 secure context，Supabase 必要）
- ✅ 全球 CDN
- ✅ 一個 commit 自動部署
- ✅ 自訂網域

## 方案 A：透過 GitHub 自動部署（推薦長期）

### 步驟

1. **把程式碼推上 GitHub**
   ```bash
   cd "C:\Users\roddi\WorkBuddy\2026-07-29-14-49-26"
   git init
   git add .
   git commit -m "init"
   # 然後到 GitHub 建立 repo 並 push
   git remote add origin https://github.com/你的帳號/你的repo.git
   git push -u origin main
   ```

2. **到 Vercel 註冊並連接 GitHub**
   - 訪問 https://vercel.com
   - 用 GitHub 登入
   - 點「Add New Project」
   - 選你的 repo
   - Framework Preset 自動偵測為 Vite
   - 點 Deploy

3. **完成**
   - 1-2 分鐘後會拿到一個網址：`https://你的專案名.vercel.app`
   - 之後推 commit 自動部署

### 啟用 HTTPS（必要）

Supabase 要求 secure context（HTTPS 或 localhost）。Vercel 自動提供 HTTPS。

第一次訪問 `https://你的專案名.vercel.app/settings` 會自動帶入 HTTPS 連線。

## 方案 B：Vercel CLI 部署（單次）

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 部署
cd "C:\Users\roddi\WorkBuddy\2026-07-29-14-49-26"
vercel

# 會問：
# ? Set up and deploy? → Y
# ? Which scope? → 選你的帳號
# ? Link to existing project? → N
# ? Project name? → sqa-solver
# ? In which directory is your code located? → ./
# ? Override settings? → N
# 自動部署，顯示網址
```

## 方案 C：Netlify（備選）

如果 Vercel 不想用：

1. 訪問 https://netlify.com
2. 註冊 + 登入
3. 點「Add new site」→「Deploy manually」
4. 拖拽 `dist/` 資料夾到 Netlify
5. 完成

`netlify.toml` 我有準備：

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 方案 D：GitHub Pages（完全免費但讀者需美國 IP）

不推薦，因為沒有 HTTPS 預設（雖然現在有），且域名不友善。

## 部署後要做的事

部署完拿到網址後：

1. **訪問網址** → 設定頁應該能正常載入
2. **填入 Supabase URL/Key**（如果還沒填）
3. **測試 https**（網址應為 `https://...`）
4. **告訴家人 / 朋友**新網址，讓他們能直接訪問

### ⚠️ 重要：跨裝置設定共享

部署到 Vercel 後，「分享連結網域」應該改成：

```
https://你的專案名.vercel.app
```

這樣家人從手機打開連結，能直接填 URL/Key 並連線。

## 性能預估

- 部署後網頁：< 1 秒載入（Vercel 全球 CDN）
- React 程式碼：~ 200 KB（gzip）
- IndexedDB：本地存取，不影響速度
- Supabase 同步：1-3 秒（看資料量）

## 成本

- Vercel 免費版：每月 100 GB 流量，無限專案
- 足夠個人 / 小家庭 / 小補習班

## 監控

部署後到 Vercel Dashboard 可以看：
- 訪問數（Analytics）
- 錯誤（Logs）
- 速度（Speed Insights）

---

## 商業化建議

部署後可以考慮：

- [ ] **自訂網域**（如 `solver.example.com`）：Vercel 支援，一年約 $10-15
- [ ] **PWA 設定**：讓使用者可「加到主畫面」像 APP 一樣
- [ ] **Open Graph 標籤**：分享連結時顯示預覽
- [ ] **錯誤監控**（Sentry）：捕捉使用者錯誤

但這些都之後再做，先完成基礎部署。
