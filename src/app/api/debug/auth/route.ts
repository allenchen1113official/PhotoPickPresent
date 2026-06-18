import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function checkVar(name: string, validator?: (v: string) => boolean): object {
  const val = process.env[name]
  if (!val) return { status: '❌ 未設定', value: null }
  const valid = validator ? validator(val) : true
  const preview = name.includes('SECRET') || name.includes('TOKEN')
    ? `${val.slice(0, 6)}…（已遮蔽）`
    : val
  return {
    status: valid ? '✅ 已設定' : '⚠️ 格式異常',
    value: preview,
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = {
    NEXTAUTH_URL: checkVar('NEXTAUTH_URL', v => v.startsWith('https://')),
    NEXTAUTH_SECRET: checkVar('NEXTAUTH_SECRET', v => v.length >= 20),
    GOOGLE_CLIENT_ID: checkVar('GOOGLE_CLIENT_ID', v =>
      v.endsWith('.apps.googleusercontent.com')
    ),
    GOOGLE_CLIENT_SECRET: checkVar('GOOGLE_CLIENT_SECRET', v =>
      v.startsWith('GOCSPX-')
    ),
    AZURE_AD_CLIENT_ID: checkVar('AZURE_AD_CLIENT_ID'),
    AZURE_AD_CLIENT_SECRET: checkVar('AZURE_AD_CLIENT_SECRET'),
  }

  const hasErrors = Object.values(result).some((v: any) =>
    v.status.startsWith('❌') || v.status.startsWith('⚠️')
  )

  return NextResponse.json(
    { ok: !hasErrors, vars: result },
    { status: 200 }
  )
}
