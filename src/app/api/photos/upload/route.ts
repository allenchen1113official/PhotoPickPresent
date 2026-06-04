import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getDb, initDb } from '@/lib/db'

export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN 未設定，請在 Vercel 環境變數中加入此金鑰。' },
      { status: 503 }
    )
  }

  await initDb()
  const db = getDb()

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const exif = JSON.parse((formData.get('exif') as string) || '{}')

  const blob = await put(`photos/${Date.now()}-${file.name}`, file, {
    access: 'public',
  })

  // Use blob pathname as stable unique ID
  const driveId = `local_${blob.pathname}`

  const existing = await db.execute({
    sql: 'SELECT id FROM photos WHERE drive_id = :id',
    args: { ':id': driveId },
  })
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
      ':drive_type': 'local',
      ':drive_id': driveId,
      ':filename': file.name,
      ':thumbnail_url': blob.url,
      ':full_url': blob.url,
      ':taken_at': exif.taken_at || null,
      ':camera_make': exif.camera_make || null,
      ':camera_model': exif.camera_model || null,
      ':lens_model': exif.lens_model || null,
      ':aperture': exif.aperture || null,
      ':shutter_speed': exif.shutter_speed || null,
      ':iso': exif.iso || null,
      ':focal_length': exif.focal_length || null,
      ':width': exif.width || null,
      ':height': exif.height || null,
    },
  })

  const photoRes = await db.execute({
    sql: 'SELECT * FROM photos WHERE id = :id',
    args: { ':id': result.lastInsertRowid! },
  })

  return NextResponse.json(photoRes.rows[0], { status: 201 })
}
