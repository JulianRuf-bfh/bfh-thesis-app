/**
 * Student result API — returns the student's matching result for the active semester.
 *
 * The result is only visible after the admin has published results
 * (semester.resultsPublished = true). Before publication, returns null
 * even if a match exists in the database.
 *
 * Returns: semester info, matched topic details, supervisor info,
 * thesis progress, and co-supervisors.
 */

import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseMethods } from '@/lib/utils'

export async function GET() {
  const session = await getAuth()
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const semester = await prisma.semester.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!semester) return NextResponse.json({ semester: null, match: null })

  const match = await prisma.match.findUnique({
    where: { studentId: session.user.id },
    include: {
      topic: {
        include: { lecturer: { select: { name: true, email: true } } },
      },
      semester: { select: { name: true, emailsSent: true } },
      progress: true,
      coSupervisors: {
        include: { lecturer: { select: { id: true, name: true, email: true } } },
        orderBy: { addedAt: 'asc' },
      },
    },
  })

  // Students only see their result once admin has published results
  const visibleMatch = semester.resultsPublished ? match : null

  return NextResponse.json({
    semester: { id: semester.id, name: semester.name, matchingRun: semester.matchingRun, emailsSent: semester.emailsSent, resultsPublished: semester.resultsPublished },
    match: visibleMatch
      ? {
          id: visibleMatch.id,
          topicTitle: visibleMatch.topic.title,
          topicDescription: visibleMatch.topic.description,
          methods: parseMethods(visibleMatch.topic.method),
          language: visibleMatch.topic.language,
          lecturerName: visibleMatch.topic.lecturer.name,
          lecturerEmail: visibleMatch.topic.lecturer.email,
          matchedRank: visibleMatch.matchedRank,
          matchedAt: visibleMatch.matchedAt.toISOString(),
          progress: visibleMatch.progress ?? null,
          coSupervisors: visibleMatch.coSupervisors.map(cs => ({
            id: cs.lecturer.id,
            name: cs.lecturer.name,
            email: cs.lecturer.email,
          })),
        }
      : null,
  })
}
