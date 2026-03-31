import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MATCH_INCLUDE = {
  student:  { select: { id: true, name: true, email: true, programme: true, level: true, studentId: true } },
  topic:    { select: { id: true, title: true, lecturerId: true } },
  semester: { select: { name: true } },
  progress: true,
  files:    { select: { id: true, seenByLecturer: true } },
} as const

export async function GET() {
  const session = await getAuth()
  if (!session || !['LECTURER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [primaryMatches, coMatches] = await Promise.all([
    // Matches where I am the first supervisor
    prisma.match.findMany({
      where:   { topic: { lecturerId: session.user.id } },
      include: MATCH_INCLUDE,
      orderBy: { matchedAt: 'asc' },
    }),
    // Matches where I am a co-supervisor (match-level)
    prisma.match.findMany({
      where:   { coSupervisors: { some: { lecturerId: session.user.id } } },
      include: MATCH_INCLUDE,
      orderBy: { matchedAt: 'asc' },
    }),
  ])

  return NextResponse.json({
    primary: primaryMatches,
    co:      coMatches,
  })
}
