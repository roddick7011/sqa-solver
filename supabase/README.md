# Supabase 設定指南

## 步驟 1：註冊並建立專案

1. 訪問 https://supabase.com
2. 用 GitHub / Google 註冊
3. 建立 Organization（任意名稱）
4. 點 **New Project**：
   - **Name**: `sqa` 或 `解題小幫手`
   - **Database Password**: 設個強密碼（之後用 anon key 連線，密碼不重要）
   - **Region**: 選 **Singapore** 或 **Tokyo**（離台灣近）

## 步驟 2：執行 Schema

1. 等專案初始化完成（1-2 分鐘）
2. 左側選 **SQL Editor**
3. 點 **New query**
4. 把 `schema.sql` 的內容全部貼上
5. 點 **Run**（或 Ctrl+Enter）

成功會看到多個 `Success. No rows returned` 的訊息，並建立：
- `profiles` table
- `notes` table
- RLS 政策
- 自動建立預設 profile 的 trigger

## 步驟 3：取得連線資訊

1. 左側選 **Project Settings** → **API**
2. 複製：
   - **Project URL**（例如 `https://xxxxx.supabase.co`）
   - **anon public** key（一長串 JWT）

## 步驟 4：填入 APP

1. 在 APP 設定頁（Settings）
2. 滾到最下面 **「☁️ 雲端同步」** 卡片
3. 把 URL 和 Key 貼上
4. 點 **「💾 儲存並連線」**
5. 連線成功 → 進入登入 / 註冊畫面

## 疑難排解

**Q: 連線失敗 / 401 Unauthorized？**
A: 確認 anon key 沒有複製到多餘空白。可以到 Project Settings → API 重新確認。

**Q: 註冊後收不到確認信？**
A: Supabase 預設需要 email 確認。可以在 Authentication → Providers → Email 把「Confirm email」關閉（測試階段方便，正式上線建議開）。

**Q: 怎麼管理現有資料？**
A: Supabase Dashboard → Table Editor 可以直接看 / 改資料。

## 免費額度

- 500 MB 資料庫
- 1 GB Storage
- 5 GB 頻寬 / 月
- 50,000 monthly active users

足夠個人 / 小家庭 / 小型補習班使用。
