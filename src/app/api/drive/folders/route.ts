import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listDriveFolders } from '@/lib/google-drive'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const folders = await listDriveFolders(session.accessToken)
    return NextResponse.json({ folders })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
