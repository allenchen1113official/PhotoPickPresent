/**
 * db.ts — LibSQL client (Turso)
 *
 * 本機開發：使用本機 SQLite 檔案 (file:./data/photos.db)
 * Vercel 部署：使用 Turso 雲端資料庫 (libsql://...)
 *
 * 環境變數：
 *   TURSO_DATABASE_URL  — Turso 資料庫 URL（本機可留空，使用 file:）
 *   TURSO_AUTH_TOKEN    — Turso 認證 Token（本機留空）
 */
import { createClient, type Client } from '@libsql/client'

let _client: Client | null = null

export function getDb(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL || 'file:./data/photos.db'
    const authToken = process.env.TURSO_AUTH_TOKEN || undefined
    _client = createClient({ url, authToken })
  }
  return _client
}

const SCHEMA = `
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
  );

  CREATE TABLE IF NOT EXISTS like_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id INTEGER NOT NULL REFERENCES photos(id),
    ip_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(photo_id, ip_hash)
  );

  CREATE INDEX IF NOT EXISTS idx_photos_show_public ON photos(show_public);
  CREATE INDEX IF NOT EXISTS idx_photos_rating ON photos(rating);
  CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(taken_at);
`

export async function initDb(): Promise<void> {
  const db = getDb()
  // Split and run each statement individually (libsql requirement)
  const stmts = SCHEMA.split(';').map(s => s.trim()).filter(Boolean)
  for (const sql of stmts) {
    await db.execute(sql)
  }
}
