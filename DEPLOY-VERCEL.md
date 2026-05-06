# 🚀 Vercel 部署 SOP

> 本文件說明如何將「攝影照片挑選與展示平台」完整部署到正式環境。  
> 預計完成時間：45–60 分鐘

---

## 整體架構

```
┌─────────────────────────────────────────────────────────┐
│                      完整架構                            │
├──────────────────────┬──────────────────────────────────┤
│  後台管理（Vercel）   │  前台相簿（GitHub Pages）         │
│  /admin              │  /gallery                        │
│  /api/*              │  靜態 HTML（從 photos.json 讀取） │
│  Google Drive 匯入   │  公開瀏覽、無需登入               │
│  SQLite（Turso）      │  自動從 Vercel 定期同步           │
└──────────────────────┴──────────────────────────────────┘

本機 / Vercel (動態)          GitHub Pages (靜態)
      ↓                              ↓
  管理照片、設星評分         →    公開展示精選作品
  設定 show_public = 1      →    npm run export:photos
                                 推送 → 自動部署
```

---

## 前置準備清單

- [ ] GitHub 帳號（已有，repo：`allenchen1113official/PhotoPickPresent`）
- [ ] Vercel 帳號（免費）— https://vercel.com
- [ ] Turso 帳號（免費）— https://turso.tech
- [ ] Google Cloud 專案（需建立 OAuth 憑證）

---

## STEP 1 — 建立 Google Cloud OAuth 憑證

> 若本機開發時已建立過，**跳至 STEP 1-4** 只需新增 Vercel 回呼 URL。

### 1-1. 建立 Google Cloud 專案

1. 前往 https://console.cloud.google.com
2. 點左上角專案選單 → **「新增專案」**
3. 專案名稱：`PhotoPickPresent`（或任意名稱）
4. 點「建立」

### 1-2. 啟用 Google Drive API

1. 左側選單 → **「API 和服務」** → **「程式庫」**
2. 搜尋 `Google Drive API` → 點進去 → **「啟用」**

### 1-3. 設定 OAuth 同意畫面

1. **「API 和服務」** → **「OAuth 同意畫面」**
2. 使用者類型：選 **「外部」** → 點「建立」
3. 填入：
   - 應用程式名稱：`AllenChen Photography`
   - 使用者支援電子郵件：你的 Gmail
   - 開發人員聯絡資訊：你的 Gmail
4. 點「儲存並繼續」（範圍、測試使用者頁面直接略過）

### 1-4. 建立 OAuth 用戶端 ID

1. **「API 和服務」** → **「憑證」** → **「建立憑證」** → **「OAuth 用戶端 ID」**
2. 應用程式類型：**「網頁應用程式」**
3. 名稱：`PhotoPickPresent Web`
4. **已授權的 JavaScript 來源** 加入：
   ```
   http://localhost:3000
   https://你的應用名稱.vercel.app
   ```
5. **已授權的重新導向 URI** 加入：
   ```
   http://localhost:3000/api/auth/callback/google
   https://你的應用名稱.vercel.app/api/auth/callback/google
   ```
   > ⚠️ Vercel 網址部署後才確定，可先只填 localhost，部署後再補上

6. 點「建立」
7. **📋 記下以下兩個值：**
   ```
   GOOGLE_CLIENT_ID     = xxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET = GOCSPX-xxxxx
   ```

---

## STEP 2 — 建立 Turso 資料庫

### 2-1. 安裝 Turso CLI

```bash
# macOS / Linux
curl -sSfL https://get.tur.so/install.sh | bash

# macOS（Homebrew）
brew install tursodatabase/tap/turso
```

### 2-2. 登入並建立資料庫

```bash
# 登入（會開啟瀏覽器）
turso auth login

# 建立資料庫（名稱自訂）
turso db create photopickpresent

# 取得資料庫 URL
turso db show photopickpresent --url
# 輸出範例：libsql://photopickpresent-allenchen.turso.io

# 建立認證 Token
turso db tokens create photopickpresent
# 輸出範例：eyJhbGciOi...（長字串）
```

**📋 記下以下兩個值：**
```
TURSO_DATABASE_URL = libsql://photopickpresent-xxxxx.turso.io
TURSO_AUTH_TOKEN   = eyJhbGci...（完整 JWT）
```

---

## STEP 3 — 設定本機環境（可選，用於本機測試）

```bash
cd /path/to/PhotoPickPresent

# 複製環境變數範本
cp .env.local.example .env.local
```

編輯 `.env.local`，填入以下值：

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=（執行 openssl rand -base64 32 取得）

# Google OAuth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# Turso 資料庫（本機可留空，自動使用本地 SQLite）
TURSO_DATABASE_URL=libsql://photopickpresent-xxxxx.turso.io
TURSO_AUTH_TOKEN=eyJhbGci...
```

```bash
# 本機啟動
npm install
npm run dev
# 前台：http://localhost:3000/gallery
# 後台：http://localhost:3000/admin
```

---

## STEP 4 — 部署到 Vercel

### 4-1. 匯入 GitHub 專案

1. 前往 https://vercel.com/new
2. 選「Continue with GitHub」登入
3. 找到 `PhotoPickPresent` repo → 點「**Import**」

### 4-2. 確認 Framework 設定

Vercel 自動偵測 Next.js，確認以下設定（通常不需更動）：

| 項目 | 值 |
|------|-----|
| Framework Preset | **Next.js** |
| Root Directory | `./` |
| Build Command | `next build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

### 4-3. 填入環境變數 ⭐ 最重要的步驟

展開「**Environment Variables**」，逐一新增以下 6 個變數：

| 變數名稱 | 範例值 | 說明 |
|---------|--------|------|
| `NEXTAUTH_URL` | `https://photopickpresent.vercel.app` | 部署後取得的網址（先留空白，部署後補） |
| `NEXTAUTH_SECRET` | `abc123...（32 字元）` | 執行 `openssl rand -base64 32` 取得 |
| `GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` | STEP 1-4 取得 |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxx` | STEP 1-4 取得 |
| `TURSO_DATABASE_URL` | `libsql://photopickpresent-xxx.turso.io` | STEP 2 取得 |
| `TURSO_AUTH_TOKEN` | `eyJhbGci...` | STEP 2 取得 |

> 提示：`NEXTAUTH_URL` 第一次先隨意填，部署完取得正式網址後再更新。

### 4-4. 開始部署

點「**Deploy**」，等待約 1–2 分鐘。

---

## STEP 5 — 部署後設定

### 5-1. 取得 Vercel 正式網址

部署成功後，Vercel 會顯示網址，例如：
```
https://photopickpresent-allenchen.vercel.app
```

### 5-2. 更新 NEXTAUTH_URL

1. Vercel 後台 → 你的專案 → **Settings → Environment Variables**
2. 找到 `NEXTAUTH_URL` → 點「**Edit**」
3. 改為正式網址：
   ```
   https://photopickpresent-allenchen.vercel.app
   ```
4. 儲存後，前往 **Deployments → 最新部署右側「...」→「Redeploy」**

### 5-3. 更新 Google OAuth 回呼 URL

回到 **Google Cloud Console → API 和服務 → 憑證 → 你的 OAuth 用戶端**：

在「已授權的重新導向 URI」**新增**：
```
https://photopickpresent-allenchen.vercel.app/api/auth/callback/google
```

在「已授權的 JavaScript 來源」**新增**：
```
https://photopickpresent-allenchen.vercel.app
```

點「儲存」。

---

## STEP 6 — 設定 GitHub Actions Secrets（GitHub Pages 自動部署）

GitHub Pages 部署需要連接 Turso 資料庫，請在 GitHub 設定以下 Secrets：

1. 前往 `https://github.com/allenchen1113official/PhotoPickPresent/settings/secrets/actions`
2. 點「**New repository secret**」，逐一新增：

| Secret 名稱 | 值 |
|------------|-----|
| `TURSO_DATABASE_URL` | Turso 資料庫 URL |
| `TURSO_AUTH_TOKEN` | Turso 認證 Token |
| `NEXTAUTH_SECRET` | 與 Vercel 相同的 secret |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret |

3. 前往 `https://github.com/allenchen1113official/PhotoPickPresent/settings/pages`
4. Source 選「**Deploy from a branch**」，Branch 選「**gh-pages**」，路徑選「**/ (root)**」
5. 點「**Save**」

設定完成後，每次推送到 `main` 分支，GitHub Actions 會自動：
- 從 Turso 匯出公開照片到 `photos.json`
- 建置靜態網站
- 部署到 GitHub Pages

---

## STEP 7 — 驗證部署

| 測試項目 | 網址 | 預期結果 |
|---------|------|---------|
| 前台相簿 | `https://your-app.vercel.app/gallery` | 顯示相簿頁面 |
| 後台管理 | `https://your-app.vercel.app/admin` | 顯示管理介面 |
| Google 登入 | 後台點「Google 登入」 | 成功登入，無錯誤 |
| Drive 匯入 | 後台「匯入照片」分頁 | 看到 Google Drive 檔案列表 |
| 資料庫連線 | 匯入一張照片 | 照片出現在「照片管理」中 |
| GitHub Pages | `https://allenchen1113official.github.io/PhotoPickPresent/gallery/` | 顯示靜態相簿 |

---

## 日常工作流程

### 新增照片到公開相簿

```
1. 前往 Vercel 後台：https://your-app.vercel.app/admin
2. 登入 Google → 切換到「匯入照片」分頁
3. 選擇 Google Drive 資料夾，勾選要匯入的照片 → 「匯入」
4. 切換到「照片管理」，設定評分、賞析文字
5. 勾選「公開顯示」開關
6. 在本機執行（或 Vercel 自動處理）：
   git push  ← 觸發 GitHub Pages 自動更新公開相簿
```

### 程式碼更新部署

```bash
git add .
git commit -m "update: 說明"
git push
# Vercel 自動重新部署（約 1 分鐘）
# GitHub Pages 同步更新（約 2–3 分鐘）
```

---

## 自訂網域（選用）

1. Vercel 後台 → Settings → **Domains**
2. 輸入你的網域（例如 `photos.yourdomain.com`）
3. 依指示在 DNS 供應商新增 CNAME 記錄：
   ```
   CNAME  photos  cname.vercel-dns.com
   ```
4. 等待 DNS 生效（5 分鐘至 24 小時）
5. 同步更新：
   - Vercel 環境變數 `NEXTAUTH_URL` → 改為自訂網域
   - Google Cloud Console OAuth 回呼 URL → 加入自訂網域

---

## 費用說明

| 服務 | 免費方案 | 備註 |
|------|---------|------|
| **Vercel** | 100 GB 流量/月，無限部署 | 個人專案完全免費 |
| **Turso** | 500 個 DB，9 GB 儲存，10 億次查詢/月 | 個人使用綽綽有餘 |
| **Google Drive** | 15 GB 免費空間 | 照片來源 |
| **GitHub Pages** | 1 GB 儲存，100 GB 流量/月 | 靜態前台完全免費 |

---

## 常見問題排除

### ❌ 登入後一直跳回首頁
**原因：** `NEXTAUTH_URL` 與實際網址不符  
**解決：** Vercel → Settings → 確認 `NEXTAUTH_URL` 完全符合（含 `https://`，無尾斜線）

### ❌ Google 登入出現「redirect_uri_mismatch」
**原因：** Google OAuth 回呼 URL 未包含 Vercel 網址  
**解決：** Google Cloud Console → 憑證 → OAuth 用戶端 → 新增 Vercel 回呼 URL

### ❌ 照片匯入後重整消失
**原因：** Turso 連線失敗  
**解決：** 確認 `TURSO_DATABASE_URL`（`libsql://` 開頭）和 `TURSO_AUTH_TOKEN` 填寫正確，點「Redeploy」

### ❌ GitHub Pages 顯示「There isn't a GitHub Pages site here」
**原因：** GitHub Pages 功能未啟用  
**解決：** 依照 STEP 6 步驟 3–5 啟用 GitHub Pages（Source: gh-pages branch）

### ❌ GitHub Pages 照片顯示空白（0 張）
**原因：** GitHub Actions Secrets 未設定，無法連接 Turso 匯出照片  
**解決：** 依照 STEP 6 步驟 1–2 設定所有 Secrets，然後手動觸發 Actions：  
`Actions → 🚀 部署前台相簿到 GitHub Pages → Run workflow`

### ❌ Vercel Build 失敗
**原因：** 程式碼錯誤或環境變數缺漏  
**解決：** 點「View Build Logs」查看詳細錯誤，或本機先執行 `npm run build` 確認

---

*SOP 版本：2.0 | 更新日期：2026-05-06*
