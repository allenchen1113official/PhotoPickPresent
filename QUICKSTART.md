# ⚡ 快速安裝指南

## 環境需求

| 工具 | 版本 | 確認指令 |
|------|------|---------|
| Node.js | v18 以上 | `node --version` |
| npm | v9 以上 | `npm --version` |

> 若尚未安裝 Node.js，請先執行：`brew install node`

---

## 三步驟啟動

### ① 安裝套件

```bash
cd PhotoPickPresent
npm install
```

### ② 建立環境設定檔

```bash
cp .env.local.example .env.local
```

用文字編輯器開啟 `.env.local`，填入以下內容：

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=          ← 貼上下方指令產生的值
GOOGLE_CLIENT_ID=         ← 貼上 Google OAuth Client ID
GOOGLE_CLIENT_SECRET=     ← 貼上 Google OAuth Client Secret
TURSO_DATABASE_URL=       ← 本機留空（自動使用本地 SQLite）
TURSO_AUTH_TOKEN=         ← 本機留空
```

**產生 NEXTAUTH_SECRET：**
```bash
openssl rand -base64 32
```

### ③ 啟動

```bash
npm run dev
```

✅ 開啟瀏覽器：

| 頁面 | 網址 |
|------|------|
| 🖼️ 前台相簿 | http://localhost:3000/gallery |
| ⚙️ 後台管理 | http://localhost:3000/admin |

---

## 取得 Google OAuth 金鑰

> 需要這組金鑰才能登入後台及連結 Google Drive

1. 前往 👉 https://console.cloud.google.com
2. 建立新專案（任意名稱）
3. 左側選單 →「API 和服務」→「程式庫」→ 啟用 **Google Drive API**
4. 左側選單 →「OAuth 同意畫面」→ 選「外部」→ 填應用程式名稱 → 儲存
5. 左側選單 →「憑證」→「建立憑證」→「OAuth 2.0 用戶端 ID」
   - 類型：**網路應用程式**
   - 已授權的重新導向 URI 加入：
     ```
     http://localhost:3000/api/auth/callback/google
     ```
6. 點「建立」→ 複製 **Client ID** 和 **Client Secret** → 貼到 `.env.local`

---

## 第一次使用後台

```
1. 開啟 http://localhost:3000/admin
2. 點「☁️ 匯入照片」→ 點「使用 Google 帳號登入」
3. 選擇 Drive 資料夾 → 點「瀏覽照片」
4. 點任一張照片的「匯入」（自動讀取 EXIF）
5. 切換到「📁 照片管理」→ 點照片縮圖
6. 右側面板：設定評分 / 填寫賞析 / 開啟「顯示於前台」→ 儲存
7. 前台 http://localhost:3000/gallery 即可看到照片
```

---

## 檔案說明

```
PhotoPickPresent/
├── src/app/
│   ├── admin/          後台管理頁面
│   ├── gallery/        前台相簿頁面
│   └── api/            API 路由
├── src/components/
│   ├── admin/          後台元件（直方圖、EXIF、評分）
│   └── gallery/        前台元件（照片卡、燈箱）
├── src/lib/
│   ├── db.ts           資料庫（LibSQL/Turso）
│   ├── google-drive.ts Google Drive API
│   └── auth.ts         NextAuth 設定
├── data/               本機 SQLite 資料庫（自動建立）
├── .env.local          環境變數（不上傳 Git）
├── QUICKSTART.md       本文件
├── README.md           完整功能說明
└── DEPLOY-VERCEL.md    Vercel 部署 SOP
```

---

## 常見問題

**Q：啟動後瀏覽器顯示空白或 500 錯誤？**
→ 確認 `.env.local` 存在且 `NEXTAUTH_SECRET` 有填值

**Q：Google 登入後出現「redirect_uri_mismatch」？**
→ 確認 Google Cloud Console 的重新導向 URI 已加入 `http://localhost:3000/api/auth/callback/google`

**Q：照片有 EXIF 資訊但光圈/快門顯示空白？**
→ 部分 Google Drive 圖片因跨域限制，EXIF 無法自動讀取，屬正常現象

**Q：要部署到正式環境？**
→ 參閱 `DEPLOY-VERCEL.md`
