/**
 * Admin dashboard statistics API.
 *
 * GET — returns aggregate stats for the active semester:
 *   - Topic count, student count, students with preferences, match count
 *   - Total student capacity across all active topics
 *   - Topics broken down by level and programme
 *   - Students broken down by programme
 */

import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseProgrammes } from '@/lib/utils'

export async function GET() {
  const session = await getAuth()
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const semester = await prisma.semester.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!semester) return NextResponse.json({ semester: null })

  const [topicCount, studentCount, prefCount, matchCount] = await Promise.all([
    prisma.topic.count({ where: { semesterId: semester.id, isActive: true } }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.preference.groupBy({ by: ['studentId'], where: { semesterId: semester.id } }),
    prisma.match.count({ where: { semesterId: semester.id } }),
  ])

  // Topics by level
  const topics = await prisma.topic.findMany({
    where: { semesterId: semester.id, isActive: true },
    select: { level: true, programmes: true, maxStudents: true, _count: { select: { preferences: true } } },
  })

  const byLevel = { BACHELOR: 0, MASTER: 0 }
  const byProgramme: Record<string, number> = {}
  let totalCapacity = 0

  for (const t of topics) {
    byLevel[t.level as keyof typeof byLevel]++
    totalCapacity += t.maxStudents
    const progs = parseProgrammes(t.programmes)
    for (const p of progs) {
      byProgramme[p] = (byProgramme[p] ?? 0) + 1
    }
  }

  // Students by programme
  const students = await prisma.user.groupBy({
    by: ['programme'],
    where: { role: 'STUDENT' },
    _count: true,
  })

  return NextResponse.json({
    semester,
    stats: {
      topicCount,
      studentCount,
      studentsWithPrefs: prefCount.length,
      matchCount,
      totalCapacity,
      topicsByLevel: byLevel,
      topicsByProgramme: byProgramme,
      studentsByProgramme: Object.fromEntries(
        students.map(s => [s.programme ?? 'Unknown', s._count])
      ),
    },
  })
}
