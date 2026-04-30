import { NextRequest, NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'
import crypto from 'crypto'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await initDb()
  const db = getDb()
  const photoId = parseInt(params.id)

  const photoRes = await db.execute({ sql: 'SELECT id, likes FROM photos WHERE id = :id', args: { ':id': photoId } })
  if (photoRes.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex')

  const existing = await db.execute({
    sql: 'SELECT id FROM like_records WHERE photo_id = :photo_id AND ip_hash = :ip_hash',
    args: { ':photo_id': photoId, ':ip_hash': ipHash },
  })

  if (existing.rows.length === 0) {
    // Add like
    await db.execute({
      sql: 'INSERT INTO like_records (photo_id, ip_hash) VALUES (:photo_id, :ip_hash)',
      args: { ':photo_id': photoId, ':ip_hash': ipHash },
    })
    await db.execute({ sql: "UPDATE photos SET likes = likes + 1, updated_at = datetime('now') WHERE id = :id", args: { ':id': photoId } })
    const updated = await db.execute({ sql: 'SELECT likes FROM photos WHERE id = :id', args: { ':id': photoId } })
    return NextResponse.json({ likes: Number((updated.rows[0] as unknown as { likes: number }).likes), liked: true })
  } else {
    // Remove like (toggle)
    await db.execute({
      sql: 'DELETE FROM like_records WHERE photo_id = :photo_id AND ip_hash = :ip_hash',
      args: { ':photo_id': photoId, ':ip_hash': ipHash },
    })
    await db.execute({ sql: "UPDATE photos SET likes = MAX(0, likes - 1), updated_at = datetime('now') WHERE id = :id", args: { ':id': photoId } })
    const updated = await db.execute({ sql: 'SELECT likes FROM photos WHERE id = :id', args: { ':id': photoId } })
    return NextResponse.json({ likes: Number((updated.rows[0] as unknown as { likes: number }).likes), liked: false })
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await initDb()
  const db = getDb()
  const photoId = parseInt(params.id)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex')
  const res = await db.execute({
    sql: 'SELECT id FROM like_records WHERE photo_id = :photo_id AND ip_hash = :ip_hash',
    args: { ':photo_id': photoId, ':ip_hash': ipHash },
  })
  return NextResponse.json({ liked: res.rows.length > 0 })
}
