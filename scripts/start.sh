#!/bin/bash
# 啟動攝影照片管理網站
export PATH="/usr/local/bin:$PATH"
cd "$(dirname "$0")/.."

if [ ! -f ".env.local" ]; then
  echo "❌ 請先複製 .env.local.example 為 .env.local 並填入設定"
  echo "   cp .env.local.example .env.local"
  exit 1
fi

echo "🚀 啟動開發伺服器..."
echo "   前台: http://localhost:3000/gallery"
echo "   後台: http://localhost:3000/admin"
echo ""
node --experimental-sqlite node_modules/.bin/next dev
