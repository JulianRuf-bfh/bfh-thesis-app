import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import path from 'path'

const DATE_FIELD: Record<string, string> = {
  proposalSubmitted:          'proposalSubmittedAt',
  midtermSubmitted:           'midtermSubmittedAt',
  finalThesisSubmitted:       'finalThesisSubmittedAt',
  finalPresentationSubmitted: 'finalPresentationSubmittedAt',
}

export async function DELETE(
  _req: Request,
  { params }: { params: { matchId: string; fileId: string } }
) {
  const session = await getAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const match = await prisma.match.findUnique({ where: { id: params.matchId } })
  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.user.role === 'STUDENT' && match.studentId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const file = await prisma.thesisFile.findUnique({ where: { id: params.fileId } })
  if (!file || file.matchId !== params.matchId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Delete from disk
  try {
    await unlink(path.join(process.cwd(), 'uploads', params.matchId, file.storedName))
  } catch { /* file may already be gone */ }

  await prisma.thesisFile.delete({ where: { id: params.fileId } })

  // If no remaining files for this milestone, revert the submitted flag
  const remaining = await prisma.thesisFile.count({
    where: { matchId: params.matchId, milestone: file.milestone },
  })
  if (remaining === 0) {
    await prisma.thesisProgress.updateMany({
      where: { matchId: params.matchId },
      data: { [file.milestone]: false, [DATE_FIELD[file.milestone]]: null },
    })
  }

  return NextResponse.json({ ok: true })
}
