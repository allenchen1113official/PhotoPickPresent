# 📄 GitHub Pages 部署 SOP

> 將前台靜態相簿部署到 GitHub Pages（免費、免維護）
> 完成後網址：`https://你的帳號.github.io/photo-gallery/`

---

## 架構說明

```
本機 / Vercel（後台管理）
       ↓ 更新照片後執行
Turso 雲端資料庫
       ↓ GitHub Actions 自動讀取
  scripts/export-photos.mjs
       ↓ 產生
  public/photos.json（靜態快照）
       ↓ Next.js 靜態建置
  out/（純靜態 HTML/CSS/JS）
       ↓ GitHub Actions 自動部署
GitHub Pages 前台相簿 🌐
```

> **靜態版本功能說明**
> - ✅ 相簿瀏覽、燈箱大圖、鍵盤操作
> - ✅ EXIF 資訊、拍攝參數顯示
> - ✅ 賞析文字
> - ✅ 分享連結
> - ✅ 顯示按讚數（靜態快照，非即時）
> - ⬜ 按讚互動（需伺服器，靜態版不支援）

---

## STEP 1 — 在 GitHub 建立 Repository

1. 前往 https://github.com/new
2. Repository name：`photo-gallery`（**名稱即是網址子目錄**）
3. 設為 **Public**（GitHub Pages 免費版需公開）
4. 不勾選任何初始化選項
5. 點「Create repository」

---

## STEP 2 — 推送程式碼

```bash
cd "/Users/allenchen/Library/CloudStorage/GoogleDrive-allenchen1113.official@gmail.com/我的雲端硬碟/PhotoPickPresent"

git init
git add .
git commit -m "init: photo gallery"

# 替換為你的 GitHub 帳號
git remote add origin https://github.com/YOUR_USERNAME/photo-gallery.git
git branch -M main
git push -u origin main
```

---

## STEP 3 — 設定 GitHub Pages

1. 前往你的 Repo → **Settings** → **Pages**
2. Source 選擇：**GitHub Actions**
3. 儲存

---

## STEP 4 — 設定 GitHub Secrets（環境變數）

前往 Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

加入以下 5 個 Secrets：

| Secret 名稱 | 值 | 哪裡取得 |
|------------|-----|---------|
| `TURSO_DATABASE_URL` | `libsql://photo-gallery-xxx.turso.io` | Turso 控制台 |
| `TURSO_AUTH_TOKEN` | `eyJhbGci...` | Turso 控制台 |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` 的輸出 | 自行產生 |
| `GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` | Google Cloud |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxx` | Google Cloud |

---

## STEP 5 — 觸發部署

推送任何 commit 到 `main` 分支即自動部署：

```bash
git commit --allow-empty -m "trigger: 初次部署 GitHub Pages"
git push
```

**或在 GitHub 手動觸發：**
Repo → **Actions** → **部署前台相簿到 GitHub Pages** → **Run workflow**

---

## STEP 6 — 確認部署成功

1. Repo → **Actions** 查看部署進度（約 2–3 分鐘）
2. 部署成功後前往：
   ```
   https://YOUR_USERNAME.github.io/photo-gallery/gallery/
   ```

---

## 日後更新照片流程

每次在後台新增/修改照片後，只需：

```bash
# 方法一：推送任何 commit（自動觸發）
git add . && git commit -m "update: 新增照片" && git push

# 方法二：GitHub Actions 手動觸發（不需要任何程式碼變更）
# Repo → Actions → Run workflow
```

---

## 自訂網域（選用）

若想用自己的網域（例如 `photos.allenchen.com`）：

1. 在 DNS 供應商加入 CNAME 記錄：
   ```
   photos  →  YOUR_USERNAME.github.io
   ```

2. Repo → Settings → Pages → Custom domain 填入 `photos.allenchen.com`

3. 勾選 **Enforce HTTPS**

4. 更新 `.github/workflows/gh-pages.yml` 中的 `NEXT_PUBLIC_BASE_PATH` 為空字串：
   ```yaml
   NEXT_PUBLIC_BASE_PATH: ''
   NEXTAUTH_URL: https://photos.allenchen.com
   ```

5. 在 `public/CNAME` 建立檔案，內容為你的網域：
   ```
   photos.allenchen.com
   ```

---

## 常見問題

**Q：Actions 失敗，顯示「Permission denied」**
→ Repo → Settings → Actions → General → Workflow permissions 選「Read and write permissions」

**Q：相簿頁面空白**
→ 確認 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN` 設定正確，且有照片已設為「顯示於前台」

**Q：圖片無法顯示**
→ Google Drive 縮圖 URL 需要 Google 帳號授權，建議改用「公開分享」的圖片連結

**Q：網址出現 404**
→ 確認網址結尾有 `/gallery/`（靜態匯出開啟 trailingSlash）

---

## 本機測試靜態建置

```bash
# 步驟 1：確認 .env.local 有填 TURSO 設定
# 步驟 2：匯出照片資料
npm run export:photos

# 步驟 3：靜態建置（輸出到 out/ 目錄）
STATIC_BUILD=true NEXT_PUBLIC_STATIC_MODE=true \
NEXT_PUBLIC_BASE_PATH=/photo-gallery \
npm run build

# 步驟 4：本機預覽（需安裝 serve）
npx serve out -p 3001
# 開啟 http://localhost:3001/photo-gallery/gallery/
```

---

*SOP 版本：1.0 | 建立日期：2026-04-30*
