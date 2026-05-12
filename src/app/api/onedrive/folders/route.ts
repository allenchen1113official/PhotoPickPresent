import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listOneDriveFolders } from '@/lib/onedrive'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.microsoftAccessToken) {
    return NextResponse.json({ error: 'Unauthorized — OneDrive not connected' }, { status: 401 })
  }

  try {
    const folders = await listOneDriveFolders(session.microsoftAccessToken)
    return NextResponse.json({ folders })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
