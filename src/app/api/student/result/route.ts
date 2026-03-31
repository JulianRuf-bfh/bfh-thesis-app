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

  return NextResponse.json({
    semester: { id: semester.id, name: semester.name, matchingRun: semester.matchingRun, emailsSent: semester.emailsSent },
    match: match
      ? {
          id: match.id,
          topicTitle: match.topic.title,
          topicDescription: match.topic.description,
          methods: parseMethods(match.topic.method),
          language: match.topic.language,
          lecturerName: match.topic.lecturer.name,
          lecturerEmail: match.topic.lecturer.email,
          matchedRank: match.matchedRank,
          matchedAt: match.matchedAt.toISOString(),
          progress: match.progress ?? null,
          coSupervisors: match.coSupervisors.map(cs => ({
            id: cs.lecturer.id,
            name: cs.lecturer.name,
            email: cs.lecturer.email,
          })),
        }
      : null,
  })
}
