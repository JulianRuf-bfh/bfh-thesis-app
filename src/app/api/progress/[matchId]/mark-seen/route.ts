/**
 * Mark-as-seen endpoint — marks all unseen files for a match as seen by the lecturer.
 *
 * POST — bulk-updates seenByLecturer = true for all thesis files in this match.
 *        Used when a lecturer opens the student progress view to clear the
 *        "new files" indicator.
 */

import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessMatch } from '@/lib/canAccessMatch'

export async function POST(
  _req: Request,
  { params }: { params: { matchId: string } }
) {
  const session = await getAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!await canAccessMatch(params.matchId, session.user.id, session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.thesisFile.updateMany({
    where: { matchId: params.matchId, seenByLecturer: false },
    data:  { seenByLecturer: true },
  })

  return NextResponse.json({ ok: true })
}
