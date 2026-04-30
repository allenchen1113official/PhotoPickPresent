# 🚀 Vercel 部署 SOP

> 本文件說明如何將「攝影照片挑選與展示平台」部署到 Vercel 正式環境。
> 預計完成時間：30–45 分鐘

---

## 架構說明

```
本機開發                    Vercel 正式環境
─────────────              ──────────────────────────────
SQLite (本地檔案)    →      Turso (LibSQL 雲端資料庫，免費)
Google OAuth              Google OAuth
localhost:3000            https://your-app.vercel.app
```

---

## 前置準備清單

- [ ] GitHub 帳號（免費）
- [ ] Vercel 帳號（免費）— https://vercel.com
- [ ] Turso 帳號（免費）— https://turso.tech
- [ ] Google Cloud OAuth 憑證（已於本機設定好）

---

## STEP 1 — 建立 Turso 資料庫

### 1-1. 安裝 Turso CLI

```bash
# macOS
brew install tursodatabase/tap/turso

# 或使用 curl
curl -sSfL https://get.tur.so/install.sh | bash
```

### 1-2. 登入並建立資料庫

```bash
# 登入（會開啟瀏覽器）
turso auth login

# 建立資料庫（名稱自訂，例如 photo-gallery）
turso db create photo-gallery

# 取得資料庫 URL
turso db show photo-gallery --url
# 輸出範例：libsql://photo-gallery-your-name.turso.io

# 取得認證 Token
turso db tokens create photo-gallery
# 輸出範例：eyJhbGciOi...（很長的 JWT）
```

**📋 記下以下兩個值（稍後需要填入 Vercel）：**
```
TURSO_DATABASE_URL = libsql://photo-gallery-xxxxx.turso.io
TURSO_AUTH_TOKEN   = eyJhbGci...（完整 JWT）
```

---

## STEP 2 — 推送程式碼到 GitHub

### 2-1. 在 GitHub 建立 Repository

1. 前往 https://github.com/new
2. Repository name：`photo-gallery`（或任意名稱）
3. 設為 **Private**（保護你的設定檔）
4. 不勾選任何初始化選項
5. 點「Create repository」

### 2-2. 推送程式碼

```bash
cd "/Users/allenchen/Library/CloudStorage/GoogleDrive-allenchen1113.official@gmail.com/我的雲端硬碟/PhotoPickPresent"

# 初始化 Git
git init
git add .
git commit -m "init: photo gallery app"

# 連結 GitHub（替換為你的 repo 網址）
git remote add origin https://github.com/YOUR_USERNAME/photo-gallery.git

# 推送
git branch -M main
git push -u origin main
```

> ⚠️ 確認 `.gitignore` 已排除 `.env.local` 和 `data/*.db`（已設定好）

---

## STEP 3 — 更新 Google OAuth 回呼 URL

1. 前往 https://console.cloud.google.com
2. 選取你的專案 → 「API 和服務」→「憑證」
3. 點擊你的 OAuth 2.0 用戶端 ID
4. 在「已授權的重新導向 URI」**加入**（不是取代）：
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```
   > ⚠️ 此時 Vercel 網址還不確定，可先部署後再回來補上

5. 儲存

---

## STEP 4 — 部署到 Vercel

### 4-1. 匯入專案

1. 前往 https://vercel.com/new
2. 點「Import Git Repository」
3. 選擇你剛建立的 `photo-gallery` repo
4. 點「Import」

### 4-2. 設定 Framework

Vercel 會自動偵測到 **Next.js**，確認設定如下：

| 項目 | 值 |
|------|-----|
| Framework Preset | Next.js |
| Root Directory | `./`（預設） |
| Build Command | `next build`（預設） |
| Output Directory | `.next`（預設） |
| Install Command | `npm install`（預設） |

### 4-3. 填入環境變數 ⭐ 最重要的步驟

點「Environment Variables」，逐一加入以下 6 個變數：

| 變數名稱 | 值 | 說明 |
|---------|-----|------|
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | 先暫時填，部署後更新 |
| `NEXTAUTH_SECRET` | （執行下方指令取得） | NextAuth 加密金鑰 |
| `GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxx` | Google OAuth Secret |
| `TURSO_DATABASE_URL` | `libsql://photo-gallery-xxx.turso.io` | STEP 1 取得 |
| `TURSO_AUTH_TOKEN` | `eyJhbGci...` | STEP 1 取得 |

**產生 NEXTAUTH_SECRET：**
```bash
openssl rand -base64 32
```

### 4-4. 部署

點「**Deploy**」按鈕，等待 1–2 分鐘。

---

## STEP 5 — 部署後設定

### 5-1. 取得正式網址

部署成功後，Vercel 會給你一個網址，例如：
```
https://photo-gallery-abc123.vercel.app
```

### 5-2. 更新 NEXTAUTH_URL

1. Vercel 後台 → 你的專案 → Settings → Environment Variables
2. 找到 `NEXTAUTH_URL`，點「Edit」
3. 改為你的正式網址：
   ```
   https://photo-gallery-abc123.vercel.app
   ```
4. 儲存後，點「**Redeploy**」（右上角）

### 5-3. 更新 Google OAuth 回呼 URL

回到 Google Cloud Console，在「已授權的重新導向 URI」加入：
```
https://photo-gallery-abc123.vercel.app/api/auth/callback/google
```

---

## STEP 6 — 驗證部署

開啟以下網址確認功能正常：

| 測試項目 | 網址 | 預期結果 |
|---------|------|---------|
| 前台首頁 | `https://your-app.vercel.app/gallery` | 顯示空白相簿頁面 |
| 後台管理 | `https://your-app.vercel.app/admin` | 顯示管理介面 |
| Google 登入 | 後台點「Google 登入」 | 成功登入，不出現錯誤 |
| 匯入照片 | 後台「匯入照片」 | 看到 Google Drive 照片列表 |
| 資料庫連線 | 匯入一張照片 | 照片出現在「照片管理」中 |

---

## 自訂網域（選用）

1. Vercel 後台 → Settings → Domains
2. 輸入你的網域（例如 `photos.yourdomain.com`）
3. 依照指示在你的 DNS 供應商新增 CNAME 記錄
4. 等待 DNS 生效（最多 24 小時）
5. 同步更新 Google OAuth 回呼 URL 和 `NEXTAUTH_URL`

---

## 日後更新網站

每次修改程式碼後，只需推送到 GitHub，Vercel 會自動重新部署：

```bash
git add .
git commit -m "update: 修改說明"
git push
```

Vercel 會自動觸發新部署，約 1 分鐘完成。

---

## 費用說明

| 服務 | 免費方案限制 | 備註 |
|------|------------|------|
| **Vercel** | 100GB 流量/月，無限部署 | 個人專案完全免費 |
| **Turso** | 500 個資料庫，9GB 儲存，10億次查詢/月 | 個人使用絕對足夠 |
| **Google Drive** | 15GB 免費空間 | 照片來源 |

---

## 常見錯誤排除

### ❌ `NEXTAUTH_URL` 設定錯誤
**症狀：** 登入後一直跳回首頁，或出現 callback 錯誤  
**解決：** 確認 `NEXTAUTH_URL` 與實際 Vercel 網址完全一致（包含 https://）

### ❌ Google 登入出現「redirect_uri_mismatch」
**症狀：** 點 Google 登入後出現 Google 錯誤頁面  
**解決：** Google Cloud Console → 憑證 → OAuth → 確認重新導向 URI 包含 Vercel 網址

### ❌ 照片匯入後消失（資料庫未連線）
**症狀：** 匯入成功但重整後不見了  
**解決：** 確認 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN` 填寫正確，重新部署

### ❌ Build 失敗
**症狀：** Vercel 顯示 Build Error  
**解決：** 點「View Build Logs」查看錯誤詳情，或在本機先執行 `npm run build` 確認無誤

---

*SOP 版本：1.0 | 建立日期：2026-04-30*
