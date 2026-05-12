import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listOneDrivePhotos } from '@/lib/onedrive'
import { getDb, initDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.microsoftAccessToken) {
    return NextResponse.json({ error: 'Unauthorized — OneDrive not connected' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const folderId = searchParams.get('folderId') || undefined
  const nextLink = searchParams.get('nextLink') || undefined

  try {
    await initDb()
    const { files, nextLink: nextPageLink } = await listOneDrivePhotos(
      session.microsoftAccessToken,
      folderId,
      nextLink
    )
    const db = getDb()

    const filesWithStatus = await Promise.all(
      files.map(async (f) => {
        const res = await db.execute({
          sql: 'SELECT id FROM photos WHERE drive_id = :id',
          args: { ':id': f.id },
        })
        return { ...f, imported: res.rows.length > 0 }
      })
    )

    return NextResponse.json({ files: filesWithStatus, nextLink: nextPageLink })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
