#!/bin/bash
# ============================================================
# build-gh-pages.sh
# 建置 GitHub Pages 靜態版本
#
# 策略：
#   GitHub Pages 只支援靜態檔案，Next.js API Routes 無法靜態化。
#   此腳本在建置前暫時移開 API / Admin 路由，建置後還原。
# ============================================================

set -e  # 任何指令失敗就中止

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/src/app/api"
ADMIN_DIR="$ROOT/src/app/admin"
TMP_DIR="/tmp/gh_pages_backup_$$"

# 清理函數（無論成功失敗都會執行）
cleanup() {
  echo ""
  echo "🔄 還原 API / Admin 路由…"
  [ -d "$TMP_DIR/api" ]   && mv "$TMP_DIR/api"   "$API_DIR"
  [ -d "$TMP_DIR/admin" ] && mv "$TMP_DIR/admin" "$ADMIN_DIR"
  rm -rf "$TMP_DIR"
  echo "✅ 還原完成"
}
trap cleanup EXIT

# ── Step 1：匯出照片資料 ────────────────────────────────────
echo "📦 Step 1/3：從資料庫匯出照片資料…"
cd "$ROOT"
node scripts/export-photos.mjs

# ── Step 2：暫時移開 API / Admin（不可靜態化）──────────────
echo ""
echo "📦 Step 2/3：暫時移開 API / Admin 路由…"
mkdir -p "$TMP_DIR"
[ -d "$API_DIR" ]   && mv "$API_DIR"   "$TMP_DIR/api"
[ -d "$ADMIN_DIR" ] && mv "$ADMIN_DIR" "$TMP_DIR/admin"

# ── Step 3：靜態建置 ────────────────────────────────────────
echo ""
echo "📦 Step 3/3：靜態建置中（Next.js export）…"

BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-/photo-gallery}"

STATIC_BUILD=true \
NEXT_PUBLIC_STATIC_MODE=true \
NEXT_PUBLIC_BASE_PATH="$BASE_PATH" \
npm run build

echo ""
echo "🎉 靜態建置完成！輸出目錄：out/"
echo "   預覽指令：npx serve out -p 3001"
echo "   預覽網址：http://localhost:3001${BASE_PATH}/gallery/"
