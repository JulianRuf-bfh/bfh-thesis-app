/**
 * Admin semester management API.
 *
 * GET  — list all semesters with aggregate counts (topics, matches,
 *        preferences, students with preferences).
 * POST — create a new semester with deadlines.
 *
 * Semesters define the academic period and control deadlines for
 * lecturer topic input and student preference submission.
 * Only one semester can be active at a time (enforced by the PUT
 * endpoint in [id]/route.ts).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function requireAdmin(session: Awaited<ReturnType<typeof getAuth>>) {
  return session?.user.role === 'ADMIN'
}

export async function GET() {
  const session = await getAuth()
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const semesters = await prisma.semester.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { topics: true, matches: true, preferences: true } },
    },
  })

  const result = await Promise.all(semesters.map(async s => {
    const studentCount = await prisma.preference.groupBy({
      by: ['studentId'],
      where: { semesterId: s.id },
    })
    return {
      ...s,
      topicCount: s._count.topics,
      matchCount: s._count.matches,
      preferenceCount: s._count.preferences,
      studentWithPrefsCount: studentCount.length,
    }
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getAuth()
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, lecturerDeadline, studentDeadline } = await req.json()
  if (!name || !lecturerDeadline || !studentDeadline) {
    return NextResponse.json({ error: 'name, lecturerDeadline, studentDeadline required' }, { status: 400 })
  }

  const semester = await prisma.semester.create({
    data: {
      name,
      lecturerDeadline: new Date(lecturerDeadline),
      studentDeadline: new Date(studentDeadline),
    },
  })

  return NextResponse.json(semester, { status: 201 })
}
