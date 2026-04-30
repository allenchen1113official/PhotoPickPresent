import { NextRequest, NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'
import type { Photo } from '@/types'

export async function GET(req: NextRequest) {
  await initDb()
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const isAdmin = searchParams.get('admin') === '1'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit
  const rating = searchParams.get('rating')
  const sort = searchParams.get('sort') || 'taken_at_desc'

  const conditions = [isAdmin ? '1=1' : 'show_public = 1']
  const args: Record<string, string | number> = {}

  if (rating) {
    conditions.push('rating = :rating')
    args[':rating'] = parseInt(rating)
  }

  const where = conditions.join(' AND ')
  const orderMap: Record<string, string> = {
    taken_at_desc: 'taken_at DESC',
    taken_at_asc: 'taken_at ASC',
    rating_desc: 'rating DESC',
    likes_desc: 'likes DESC',
    created_desc: 'created_at DESC',
  }
  const orderBy = orderMap[sort] || 'taken_at DESC'

  const countRes = await db.execute({ sql: `SELECT COUNT(*) as c FROM photos WHERE ${where}`, args })
  const total = Number((countRes.rows[0] as unknown as { c: number }).c)

  const photosRes = await db.execute({
    sql: `SELECT * FROM photos WHERE ${where} ORDER BY ${orderBy} LIMIT :limit OFFSET :offset`,
    args: { ...args, ':limit': limit, ':offset': offset },
  })

  return NextResponse.json({ photos: photosRes.rows as unknown as Photo[], total, page, limit })
}

export async function POST(req: NextRequest) {
  await initDb()
  const db = getDb()
  const body = await req.json()
  const { drive_type, drive_id, filename, thumbnail_url, full_url, exif } = body

  const existing = await db.execute({ sql: 'SELECT id FROM photos WHERE drive_id = :id', args: { ':id': drive_id } })
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'Already imported' }, { status: 409 })
  }

  const result = await db.execute({
    sql: `INSERT INTO photos (drive_type, drive_id, filename, thumbnail_url, full_url,
            taken_at, camera_make, camera_model, lens_model, aperture, shutter_speed,
            iso, focal_length, width, height)
          VALUES (:drive_type,:drive_id,:filename,:thumbnail_url,:full_url,
            :taken_at,:camera_make,:camera_model,:lens_model,:aperture,:shutter_speed,
            :iso,:focal_length,:width,:height)`,
    args: {
      ':drive_type': drive_type || 'google',
      ':drive_id': drive_id,
      ':filename': filename,
      ':thumbnail_url': thumbnail_url || null,
      ':full_url': full_url || null,
      ':taken_at': exif?.taken_at || null,
      ':camera_make': exif?.camera_make || null,
      ':camera_model': exif?.camera_model || null,
      ':lens_model': exif?.lens_model || null,
      ':aperture': exif?.aperture || null,
      ':shutter_speed': exif?.shutter_speed || null,
      ':iso': exif?.iso || null,
      ':focal_length': exif?.focal_length || null,
      ':width': exif?.width || null,
      ':height': exif?.height || null,
    },
  })

  const photoRes = await db.execute({ sql: 'SELECT * FROM photos WHERE id = :id', args: { ':id': result.lastInsertRowid! } })
  return NextResponse.json(photoRes.rows[0] as unknown as Photo, { status: 201 })
}
