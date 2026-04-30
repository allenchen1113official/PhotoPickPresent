import { NextRequest, NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'
import type { Photo } from '@/types'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await initDb()
  const db = getDb()
  const res = await db.execute({ sql: 'SELECT * FROM photos WHERE id = :id', args: { ':id': params.id } })
  if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(res.rows[0] as unknown as Photo)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await initDb()
  const db = getDb()
  const body = await req.json()
  const allowedFields = ['rating', 'notes', 'appreciation', 'show_public']
  const updates: string[] = []
  const args: Record<string, string | number> = {}

  for (const field of allowedFields) {
    if (field in body) {
      updates.push(`${field} = :${field}`)
      args[`:${field}`] = body[field]
    }
  }
  if (updates.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

  updates.push(`updated_at = datetime('now')`)
  args[':id'] = parseInt(params.id)

  await db.execute({ sql: `UPDATE photos SET ${updates.join(', ')} WHERE id = :id`, args })
  const res = await db.execute({ sql: 'SELECT * FROM photos WHERE id = :id', args: { ':id': params.id } })
  return NextResponse.json(res.rows[0] as unknown as Photo)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await initDb()
  const db = getDb()
  await db.execute({ sql: 'DELETE FROM photos WHERE id = :id', args: { ':id': params.id } })
  return NextResponse.json({ ok: true })
}
