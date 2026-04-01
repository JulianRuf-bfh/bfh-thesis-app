import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessMatch } from '@/lib/canAccessMatch'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(
  _req: Request,
  { params }: { params: { matchId: string; storedName: string } }
) {
  const session = await getAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!await canAccessMatch(params.matchId, session.user.id, session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const match = await prisma.match.findUnique({ where: { id: params.matchId } })
  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fileRecord = await prisma.thesisFile.findFirst({
    where: { matchId: params.matchId, storedName: params.storedName },
  })
  if (!fileRecord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Mark as seen when lecturer downloads/views
  const role = session.user.role
  if (role === 'LECTURER' || role === 'ADMIN') {
    await prisma.thesisFile.update({
      where: { id: fileRecord.id },
      data:  { seenByLecturer: true },
    })
  }

  let buffer: Buffer
  try {
    buffer = await readFile(
      path.join(process.cwd(), 'uploads', params.matchId, params.storedName)
    )
  } catch {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type':        fileRecord.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileRecord.originalName}"`,
    },
  })
}
