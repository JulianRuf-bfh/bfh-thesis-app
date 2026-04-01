// POST — admin manually creates a match.
//         Two modes:
//           A) Existing topic:  { studentId, topicId, coSupervisorIds? }
//           B) New topic:       { studentId, newTopic: { title, lecturerId, method, language }, coSupervisorIds? }
//         Bypasses all deadlines and matchingRun locks — admin always has this ability.

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function requireAdmin(session: Awaited<ReturnType<typeof getAuth>>) {
  return session?.user.role === 'ADMIN'
}

export async function POST(req: NextRequest) {
  const session = await getAuth()
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    studentId: string
    topicId?: string
    newTopic?: { title: string; lecturerId: string; method: string; language: string }
    coSupervisorIds?: string[]
  }

  const { studentId, topicId, newTopic, coSupervisorIds } = body

  if (!studentId) return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
  if (!topicId && !newTopic) return NextResponse.json({ error: 'Either topicId or newTopic is required' }, { status: 400 })
  if (topicId && newTopic) return NextResponse.json({ error: 'Provide either topicId or newTopic, not both' }, { status: 400 })
  if (newTopic && (!newTopic.title?.trim() || !newTopic.lecturerId || !newTopic.method || !newTopic.language)) {
    return NextResponse.json({ error: 'newTopic requires title, lecturerId, method and language' }, { status: 400 })
  }

  // Verify student exists
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, role: true, name: true, level: true, programme: true },
  })
  if (!student || student.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  // Verify student not already matched
  const existingMatch = await prisma.match.findUnique({ where: { studentId } })
  if (existingMatch) {
    return NextResponse.json({ error: 'Student is already matched' }, { status: 400 })
  }

  // Get active semester (needed for both paths)
  const semester = await prisma.semester.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!semester) return NextResponse.json({ error: 'No active semester found' }, { status: 400 })

  // Validate co-supervisors
  const coIds = Array.isArray(coSupervisorIds) ? coSupervisorIds.filter(Boolean) : []
  if (coIds.length > 0) {
    const coUsers = await prisma.user.findMany({
      where: { id: { in: coIds } },
      select: { id: true, role: true },
    })
    const validCoIds = new Set(coUsers.filter(u => ['LECTURER', 'ADMIN'].includes(u.role)).map(u => u.id))
    const invalid = coIds.filter(id => !validCoIds.has(id))
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Invalid co-supervisor id(s): ${invalid.join(', ')}` }, { status: 400 })
    }
  }

  // ── Path A: existing topic ────────────────────────────────────────────────
  if (topicId) {
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: { _count: { select: { matches: true } } },
    })
    if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    if (!topic.isActive) return NextResponse.json({ error: 'Topic is not active' }, { status: 400 })
    if (topic._count.matches >= topic.maxStudents) {
      return NextResponse.json({ error: 'Topic is already at full capacity' }, { status: 400 })
    }

    const match = await prisma.$transaction(async (tx) => {
      const m = await tx.match.create({
        data: { studentId, topicId, semesterId: topic.semesterId, matchedRank: 0 },
      })
      if (coIds.length > 0) {
        await tx.matchCoSupervisor.createMany({
          data: coIds.map(lecturerId => ({ matchId: m.id, lecturerId })),
        })
      }
      return m
    })

    return NextResponse.json({ ok: true, matchId: match.id }, { status: 201 })
  }

  // ── Path B: create new topic on the fly ───────────────────────────────────
  const { title, lecturerId, method, language } = newTopic!

  // Verify supervisor exists
  const supervisor = await prisma.user.findUnique({
    where: { id: lecturerId },
    select: { id: true, role: true },
  })
  if (!supervisor || !['LECTURER', 'ADMIN'].includes(supervisor.role)) {
    return NextResponse.json({ error: 'Supervisor not found' }, { status: 404 })
  }

  // Derive level from student; fall back to BACHELOR
  const level = student.level ?? 'BACHELOR'

  const match = await prisma.$transaction(async (tx) => {
    // Create the topic (isActive: false so it doesn't appear in the browse list)
    const topic = await tx.topic.create({
      data: {
        title: title.trim(),
        description: null,
        method: JSON.stringify([method]),
        language,
        level,
        programmes:     student.programme ? JSON.stringify([student.programme]) : '[]',
        specialisations: '[]',
        maxStudents:    1,
        isActive:       false,
        semesterId:     semester.id,
        lecturerId,
      },
    })

    const m = await tx.match.create({
      data: { studentId, topicId: topic.id, semesterId: semester.id, matchedRank: 0 },
    })

    if (coIds.length > 0) {
      await tx.matchCoSupervisor.createMany({
        data: coIds.map(cId => ({ matchId: m.id, lecturerId: cId })),
      })
    }

    return m
  })

  return NextResponse.json({ ok: true, matchId: match.id }, { status: 201 })
}
