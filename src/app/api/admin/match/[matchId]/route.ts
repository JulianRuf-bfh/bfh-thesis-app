/**
 * Admin single match API — fetch detailed information about a specific match.
 *
 * GET — returns the match with full student, topic, lecturer, progress,
 *       files, and co-supervisor data. Used for the admin detail view.
 */

import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { matchId: string } }) {
  const session = await getAuth()
  if (session?.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const match = await prisma.match.findUnique({
    where: { id: params.matchId },
    include: {
      student:  { select: { id: true, name: true, email: true, programme: true, level: true, studentId: true } },
      topic:    { include: { lecturer: { select: { id: true, name: true, email: true } } } },
      semester: { select: { id: true, name: true } },
      progress: true,
      files:    { orderBy: { uploadedAt: 'asc' } },
      coSupervisors: { include: { lecturer: { select: { id: true, name: true, email: true } } }, orderBy: { addedAt: 'asc' } },
    },
  })
  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(match)
}
