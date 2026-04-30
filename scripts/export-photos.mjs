#!/usr/bin/env node
/**
 * export-photos.js
 * 從 Turso 資料庫匯出公開照片到 public/photos.json
 * 供 GitHub Pages 靜態版本使用
 *
 * 使用方式：
 *   node scripts/export-photos.js
 *
 * 環境變數：
 *   TURSO_DATABASE_URL  (未設定時使用本機 SQLite)
 *   TURSO_AUTH_TOKEN
 */

import { createClient } from '@libsql/client'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// 載入 .env.local（本機執行時）
try {
  const { config } = await import('dotenv')
  config({ path: join(ROOT, '.env.local') })
} catch {
  // dotenv 未安裝時跳過（GitHub Actions 直接用 secrets）
}

const url = process.env.TURSO_DATABASE_URL || `file:${join(ROOT, 'data/photos.db')}`
const authToken = process.env.TURSO_AUTH_TOKEN || undefined

console.log(`📦 連接資料庫：${url.startsWith('libsql') ? url : '本機 SQLite'}`)

const db = createClient({ url, authToken })

try {
  // 建立資料表（若不存在）
  await db.execute(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drive_type TEXT NOT NULL DEFAULT 'google',
      drive_id TEXT NOT NULL UNIQUE,
      filename TEXT NOT NULL,
      thumbnail_url TEXT,
      full_url TEXT,
      taken_at TEXT,
      camera_make TEXT,
      camera_model TEXT,
      lens_model TEXT,
      aperture REAL,
      shutter_speed TEXT,
      iso INTEGER,
      focal_length REAL,
      width INTEGER,
      height INTEGER,
      rating INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      appreciation TEXT,
      show_public INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const res = await db.execute(
    `SELECT id, drive_id, filename, thumbnail_url, full_url,
            taken_at, camera_make, camera_model, lens_model,
            aperture, shutter_speed, iso, focal_length,
            width, height, appreciation, likes, rating, updated_at
     FROM photos
     WHERE show_public = 1
     ORDER BY taken_at DESC`
  )

  const photos = res.rows

  // 寫出 public/photos.json
  const outDir = join(ROOT, 'public')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'photos.json')
  writeFileSync(outPath, JSON.stringify(photos, null, 2), 'utf-8')

  console.log(`✅ 匯出完成：${photos.length} 張公開照片 → public/photos.json`)
} catch (err) {
  console.error('❌ 匯出失敗：', err)
  // 若資料庫不可用，寫出空陣列（讓靜態建置可以繼續）
  const outPath = join(ROOT, 'public', 'photos.json')
  writeFileSync(outPath, '[]', 'utf-8')
  console.log('⚠️  已寫出空的 photos.json，靜態網站將顯示空相簿')
}
