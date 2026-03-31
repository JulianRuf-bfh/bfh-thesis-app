import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseProgrammes, parseSpecialisations, parseMethods } from '@/lib/utils'

// GET — fetch current student's preferences for the active semester
export async function GET() {
  const session = await getAuth()
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const semester = await prisma.semester.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!semester) return NextResponse.json([])

  const prefs = await prisma.preference.findMany({
    where: { studentId: session.user.id, semesterId: semester.id },
    orderBy: { rank: 'asc' },
    include: {
      topic: {
        include: {
          lecturer: { select: { name: true } },
          _count: { select: { preferences: true } },
        },
      },
    },
  })

  return NextResponse.json(prefs.map(p => ({
    id: p.id,
    rank: p.rank,
    priorityDate: p.priorityDate.toISOString(),
    topic: {
      id: p.topic.id,
      title: p.topic.title,
      description: p.topic.description,
      methods: parseMethods(p.topic.method),
      language: p.topic.language,
      level: p.topic.level,
      programmes: parseProgrammes(p.topic.programmes),
      specialisations: parseSpecialisations(p.topic.specialisations),
      maxStudents: p.topic.maxStudents,
      isActive: p.topic.isActive,
      semesterId: p.topic.semesterId,
      lecturerId: p.topic.lecturerId,
      lecturerName: p.topic.lecturer.name,
      preferenceCount: p.topic._count.preferences,
      availableSlots: Math.max(0, p.topic.maxStudents - p.topic._count.preferences),
      createdAt: p.topic.createdAt.toISOString(),
    },
  })))
}

// POST — add a topic to preferences (auto-assigned to next available rank)
export async function POST(req: NextRequest) {
  const session = await getAuth()
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { topicId } = await req.json()
  if (!topicId) return NextResponse.json({ error: 'topicId required' }, { status: 400 })

  const semester = await prisma.semester.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!semester) return NextResponse.json({ error: 'No active semester' }, { status: 400 })

  // Check student deadline
  if (new Date() > semester.studentDeadline) {
    return NextResponse.json({ error: 'Submission deadline has passed' }, { status: 400 })
  }

  // Check current count
  const existing = await prisma.preference.count({
    where: { studentId: session.user.id, semesterId: semester.id },
  })
  if (existing >= 4) {
    return NextResponse.json({ error: 'Maximum 4 preferences allowed' }, { status: 400 })
  }

  // Check already selected
  const dupe = await prisma.preference.findFirst({
    where: { studentId: session.user.id, topicId, semesterId: semester.id },
  })
  if (dupe) return NextResponse.json({ error: 'Already in preferences' }, { status: 400 })

  // Check topic availability
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { _count: { select: { preferences: true } } },
  })
  if (!topic || !topic.isActive) {
    return NextResponse.json({ error: 'Topic not found or inactive' }, { status: 400 })
  }
  if (topic._count.preferences >= topic.maxStudents) {
    return NextResponse.json({ error: 'Topic is full' }, { status: 400 })
  }

  const pref = await prisma.preference.create({
    data: {
      studentId: session.user.id,
      topicId,
      semesterId: semester.id,
      rank: existing + 1,
      priorityDate: new Date(),
    },
  })

  return NextResponse.json(pref, { status: 201 })
}

// PUT — reorder preferences (send full ordered array of topicIds)
export async function PUT(req: NextRequest) {
  const session = await getAuth()
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orderedTopicIds }: { orderedTopicIds: string[] } = await req.json()
  if (!Array.isArray(orderedTopicIds)) {
    return NextResponse.json({ error: 'orderedTopicIds must be an array' }, { status: 400 })
  }

  const semester = await prisma.semester.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!semester) return NextResponse.json({ error: 'No active semester' }, { status: 400 })

  if (new Date() > semester.studentDeadline) {
    return NextResponse.json({ error: 'Deadline has passed' }, { status: 400 })
  }

  // Two-phase update to avoid unique constraint violations on (studentId, rank, semesterId):
  // Phase 1 — set temporary high ranks (100+) that won't conflict with any real rank
  // Phase 2 — set the actual new ranks
  await prisma.$transaction(async tx => {
    for (let i = 0; i < orderedTopicIds.length; i++) {
      await tx.preference.updateMany({
        where: { studentId: session.user.id, topicId: orderedTopicIds[i], semesterId: semester.id },
        data: { rank: 100 + i },
      })
    }
    for (let i = 0; i < orderedTopicIds.length; i++) {
      await tx.preference.updateMany({
        where: { studentId: session.user.id, topicId: orderedTopicIds[i], semesterId: semester.id },
        data: { rank: i + 1 },
      })
    }
  })

  return NextResponse.json({ ok: true })
}

// DELETE — remove a topic from preferences and re-rank remaining
export async function DELETE(req: NextRequest) {
  const session = await getAuth()
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { topicId } = await req.json()

  const semester = await prisma.semester.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!semester) return NextResponse.json({ error: 'No active semester' }, { status: 400 })

  if (new Date() > semester.studentDeadline) {
    return NextResponse.json({ error: 'Deadline has passed' }, { status: 400 })
  }

  // Delete the preference
  await prisma.preference.deleteMany({
    where: { studentId: session.user.id, topicId, semesterId: semester.id },
  })

  // Re-rank remaining preferences
  const remaining = await prisma.preference.findMany({
    where: { studentId: session.user.id, semesterId: semester.id },
    orderBy: { rank: 'asc' },
  })

  await prisma.$transaction(
    remaining.map((p, idx) =>
      prisma.preference.update({
        where: { id: p.id },
        data: { rank: idx + 1 },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
