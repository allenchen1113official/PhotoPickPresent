import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listDrivePhotos } from '@/lib/google-drive'
import { getDb, initDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const folderId = searchParams.get('folderId') || undefined
  const pageToken = searchParams.get('pageToken') || undefined

  try {
    await initDb()
    const { files, nextPageToken } = await listDrivePhotos(session.accessToken, folderId, pageToken)
    const db = getDb()

    const filesWithStatus = await Promise.all(
      files.map(async (f) => {
        const res = await db.execute({ sql: 'SELECT id FROM photos WHERE drive_id = :id', args: { ':id': f.id } })
        return { ...f, imported: res.rows.length > 0 }
      })
    )

    return NextResponse.json({ files: filesWithStatus, nextPageToken })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
