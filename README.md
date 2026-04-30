# 📷 攝影照片挑選與展示平台

## 功能介紹

### 後台（/admin）
- ☁️ **連結 Google Drive** — 瀏覽雲端硬碟資料夾，一鍵匯入照片
- 📊 **EXIF 資訊** — 自動解析拍攝時間、相機型號、鏡頭
- 🎛️ **攝影參數** — 光圈 (f/)、快門速度、感光度 (ISO)、焦距
- 📈 **RGB 直方圖** — 即時計算 R/G/B 通道分布圖
- ⭐ **評分系統** — 1–5 星評分（1=保留觀察 ~ 5=最佳）
- 📝 **拍攝備註** — 私人記錄拍攝情境
- ✍️ **賞析文字** — 公開展示的故事說明
- 👁️ **顯示/隱藏** — 控制照片是否出現在前台

### 前台（/gallery）
- 🖼️ 展示已公開照片，瀑布式格線排版
- 🔍 Lightbox 大圖瀏覽（鍵盤 ← → 切換）
- 💛 **按讚功能** — 防重複按讚（IP 去重）
- 🔗 **分享功能** — Web Share API / 複製連結
- 📖 賞析文字展示
- 無限滾動載入

---

## 快速開始

### 1. 建立 Google Cloud 專案（取得 API 金鑰）

1. 前往 https://console.cloud.google.com
2. 建立新專案
3. 啟用 **Google Drive API** 和 **Google+ API**
4. 建立 OAuth 2.0 憑證（Web 應用程式）
5. 授權回呼 URI 加入：`http://localhost:3000/api/auth/callback/google`
6. 複製 Client ID 和 Client Secret

### 2. 設定環境變數

```bash
cp .env.local.example .env.local
```

編輯 `.env.local`：
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=隨機字串（可用 openssl rand -base64 32 產生）
GOOGLE_CLIENT_ID=你的-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=你的-client-secret
```

### 3. 啟動

```bash
bash scripts/start.sh
```

或直接：
```bash
node --experimental-sqlite node_modules/.bin/next dev
```

- **前台**：http://localhost:3000/gallery
- **後台**：http://localhost:3000/admin

---

## 使用流程

1. 開啟後台 `/admin`
2. 點選「☁️ 匯入照片」
3. 使用 Google 帳號登入
4. 選擇資料夾或瀏覽全部
5. 點「匯入」（自動解析 EXIF）
6. 切換到「📁 照片管理」
7. 點擊照片開啟編輯面板：
   - 查看 RGB 直方圖、EXIF 資訊
   - 設定 1–5 星評分
   - 填寫拍攝備註（私人）
   - 填寫賞析文字（前台顯示）
   - 開啟「顯示於前台」開關

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 樣式 | Tailwind CSS |
| 資料庫 | Node.js 25 內建 SQLite (node:sqlite) |
| 雲端 | Google Drive API v3 |
| 認證 | NextAuth.js (Google OAuth) |
| EXIF | exifr |
| 直方圖 | Canvas API |
