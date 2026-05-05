# 🚀 完整部署 SOP：Vercel + Turso

> 完成後您將獲得完整功能網站（讚、分享、Google Drive 匯入、管理後台）

---

## 總覽

| 服務 | 用途 | 費用 |
|------|------|------|
| **Vercel** | 部署 Next.js 網站 | 免費 Hobby 方案 |
| **Turso** | 雲端 SQLite 資料庫 | 免費 500 DB / 9GB |
| **Google Cloud** | Google Drive API + OAuth | 免費額度已足夠 |

---

## STEP 1：建立 Turso 資料庫

### 1-1 安裝 Turso CLI

```bash
# macOS
brew install tursodatabase/tap/turso

# 或用 curl（跨平台）
curl -sSfL https://get.tur.so/install.sh | bash
```

### 1-2 登入 Turso

```bash
turso auth login
```

瀏覽器會開啟登入頁，使用 GitHub 帳號登入即可。

### 1-3 建立資料庫

```bash
# 建立資料庫（名稱可自訂）
turso db create photopickpresent

# 查看資料庫資訊（取得 URL）
turso db show photopickpresent
```

輸出範例：
```
Name:           photopickpresent
URL:            libsql://photopickpresent-yourusername.turso.io
...
```

### 1-4 取得認證 Token

```bash
turso db tokens create photopickpresent
```

複製輸出的 token（很長的字串），之後要填入 Vercel。

### 1-5 記錄這兩個值

```
TURSO_DATABASE_URL = libsql://photopickpresent-yourusername.turso.io
TURSO_AUTH_TOKEN   = eyJhbGci...（剛才複製的 token）
```

---

## STEP 2：設定 Google Cloud（OAuth + Drive API）

> 如果您在本機開發時已設定過，**需要新增 Vercel 網域**到允許清單。

### 2-1 前往 Google Cloud Console

開啟：https://console.cloud.google.com/

### 2-2 開啟已有的 OAuth 憑證

**APIs & Services → Credentials → 點選您的 OAuth 2.0 Client**

### 2-3 新增 Vercel 網域（重要！）

在 **Authorized JavaScript origins** 新增：
```
https://your-project.vercel.app
```

在 **Authorized redirect URIs** 新增：
```
https://your-project.vercel.app/api/auth/callback/google
```

> ⚠️ `your-project` 是您的 Vercel 專案名稱，部署後才知道；
> 您可以先填入，然後在 Vercel 部署完成後確認並補填。

### 2-4 記錄這兩個值

```
GOOGLE_CLIENT_ID     = xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = GOCSPX-xxxxxxxxxx
```

---

## STEP 3：產生 NEXTAUTH_SECRET

在終端機執行：

```bash
openssl rand -base64 32
```

複製輸出（例如：`K3dF2lM9pQr7...`），這是您的 `NEXTAUTH_SECRET`。

---

## STEP 4：部署到 Vercel

### 4-1 前往 Vercel 並匯入專案

開啟：https://vercel.com/new

1. 點選 **Import Git Repository**
2. 選擇 **GitHub** → 授權 Vercel 存取您的 GitHub
3. 找到 `PhotoPickPresent` 專案 → 點選 **Import**

### 4-2 設定環境變數（關鍵步驟）

在匯入畫面的 **Environment Variables** 區段，逐一填入：

| Name | Value |
|------|-------|
| `NEXTAUTH_URL` | `https://your-project.vercel.app`（先填，部署後確認） |
| `NEXTAUTH_SECRET` | 剛才 openssl 產生的字串 |
| `GOOGLE_CLIENT_ID` | Google Cloud 的 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google Cloud 的 Client Secret |
| `TURSO_DATABASE_URL` | `libsql://photopickpresent-yourusername.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso 的 token |

### 4-3 點選 Deploy

點選 **Deploy** 按鈕，等待 2~3 分鐘。

### 4-4 取得正確的 Vercel 網址

部署完成後，Vercel 會顯示您的網址，例如：
```
https://photo-pick-present-abc123.vercel.app
```

### 4-5 更新 NEXTAUTH_URL（必要）

部署完成後，進入 Vercel 專案：
- **Settings → Environment Variables**
- 找到 `NEXTAUTH_URL`
- 修改為實際網址：`https://photo-pick-present-abc123.vercel.app`
- 點選 **Save**
- 回到 **Deployments → 最新一筆 → Redeploy**（讓環境變數生效）

### 4-6 更新 Google OAuth（同步）

回到 Google Cloud Console，把 `your-project` 換成實際的 Vercel 網域：

**Authorized JavaScript origins：**
```
https://photo-pick-present-abc123.vercel.app
```

**Authorized redirect URIs：**
```
https://photo-pick-present-abc123.vercel.app/api/auth/callback/google
```

---

## STEP 5：初始化資料庫

Turso 資料庫是空的，第一次登入後台會自動建立 Schema（`initDb()` 在 API 路由中自動執行）。

您也可以用 Turso CLI 確認：

```bash
turso db shell photopickpresent

# 在 shell 中執行
.tables
# 應看到：photos  like_records
```

---

## STEP 6：驗收測試

### 測試清單

| 功能 | 測試方法 | 預期結果 |
|------|----------|----------|
| 網站開啟 | 前往 `https://your.vercel.app/gallery` | 看到畫廊頁面 |
| Google 登入 | 前往 `/admin` | 跳轉 Google 登入 |
| Drive 匯入 | Admin → Import from Drive | 看到 Google Drive 照片清單 |
| 匯入照片 | 點選匯入 | 照片出現在 Admin 清單 |
| 編輯照片 | 點選照片 → 設定星星/賞析/顯示 | 儲存成功 |
| 公開顯示 | 開啟 show_public → 前往 /gallery | 照片出現 |
| 按讚功能 | 點讚按鈕 | 讚數 +1，圖示變紅 |
| 分享功能 | 點分享按鈕 | 複製連結或呼叫 Share API |

---

## 您的網站網址

| 頁面 | 網址 |
|------|------|
| **公開畫廊** | `https://your-project.vercel.app/gallery` |
| **管理後台** | `https://your-project.vercel.app/admin` |

---

## 常見問題

### ❓ 登入後顯示「AccessDenied」

→ Google OAuth 的 redirect URI 未包含 Vercel 網域，請重新確認 Step 2-3。

### ❓ Drive 匯入看不到照片

→ 確認 OAuth scope 包含 `drive.readonly`，可重新登入（consent 畫面點「允許全部」）。

### ❓ 按讚沒有效果

→ 確認 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN` 正確，可到 Vercel → Functions log 查看錯誤。

### ❓ 如何查看 Vercel 錯誤日誌

→ Vercel 專案 → **Functions** 頁籤 → 點選 Function → 查看 Logs。

### ❓ 自訂網域

→ Vercel → **Settings → Domains** → 新增您的網域 → 依提示設定 DNS。

---

## 環境變數總整理

```env
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=（openssl rand -base64 32 產生）

GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

TURSO_DATABASE_URL=libsql://photopickpresent-yourusername.turso.io
TURSO_AUTH_TOKEN=eyJhbGci...
```

---

*部署完成後，您同時擁有：*
- *GitHub Pages（靜態展示，免費永久）*
- *Vercel + Turso（完整功能，讚/分享/管理後台）*
