/**
 * Lecturer students API — lists matched students for the current lecturer.
 *
 * Returns two groups:
 * - primary: students matched to topics owned by this lecturer (first supervisor)
 * - co: students where this lecturer is a co-supervisor
 *
 * Results are gated on semester.resultsPublished — lecturers only see
 * their students after the admin publishes matching results.
 * Admins always see all data regardless of publication status.
 */

import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** Shared include clause for match queries — fetches student, topic, progress, and file data. */
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

  // Lecturers only see matches after admin has published results.
  // Admins always see everything.
  const activeSemester = await prisma.semester.findFirst({
    where: { isActive: true },
    select: { resultsPublished: true },
  })
  // Own-topic matches (matchedRank === 0) are always visible to the lecturer who accepted them —
  // they personally agreed to supervise, no need to wait for admin to publish bulk results.
  const resultsPublished = activeSemester?.resultsPublished ?? false

  const [primaryMatches, coMatches] = await Promise.all([
    prisma.match.findMany({
      where: {
        topic: { lecturerId: session.user.id },
        // When results not published yet: only show own-topic matches (matchedRank 0)
        ...(session.user.role === 'LECTURER' && !resultsPublished
          ? { matchedRank: 0 }
          : {}),
      },
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
    published: resultsPublished,
  })
}
