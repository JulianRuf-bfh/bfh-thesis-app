import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseProgrammes, parseSpecialisations, parseMethods } from '@/lib/utils'

function requireLecturer(session: Awaited<ReturnType<typeof getAuth>>) {
  if (!session) return false
  return session.user.role === 'LECTURER' || session.user.role === 'ADMIN'
}

// GET — lecturer's own topics for the active semester
export async function GET(req: NextRequest) {
  const session = await getAuth()
  if (!requireLecturer(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const semesterId = req.nextUrl.searchParams.get('semesterId')

  const semester = semesterId
    ? await prisma.semester.findUnique({ where: { id: semesterId } })
    : await prisma.semester.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })

  if (!semester) return NextResponse.json([])

  const topics = await prisma.topic.findMany({
    where: { lecturerId: session!.user.id, semesterId: semester.id },
    include: {
      _count: { select: { preferences: true, matches: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(topics.map(t => ({
    ...t,
    methods: parseMethods(t.method),
    programmes: parseProgrammes(t.programmes),
    specialisations: parseSpecialisations(t.specialisations),
    preferenceCount: t._count.preferences,
    matchCount: t._count.matches,
    availableSlots: Math.max(0, t.maxStudents - Math.max(t._count.matches, t._count.preferences)),
  })))
}

// POST — create a new topic
export async function POST(req: NextRequest) {
  const session = await getAuth()
  if (!requireLecturer(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    title, description, methods, language, level,
    programmes, specialisations, maxStudents,
  } = body

  if (!title || !methods?.length || !language || !level || !programmes?.length || !maxStudents) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (maxStudents < 1 || maxStudents > 8) {
    return NextResponse.json({ error: 'maxStudents must be between 1 and 8' }, { status: 400 })
  }

  // Check lecturer's total capacity across active semester topics doesn't exceed 8
  const semester = await prisma.semester.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!semester) return NextResponse.json({ error: 'No active semester' }, { status: 400 })

  if (new Date() > semester.lecturerDeadline) {
    return NextResponse.json({ error: 'Lecturer input deadline has passed' }, { status: 400 })
  }
  if (semester.matchingRun) {
    return NextResponse.json({ error: 'Matching has already been run — topics are locked' }, { status: 400 })
  }

  const existingTopics = await prisma.topic.findMany({
    where: { lecturerId: session!.user.id, semesterId: semester.id, isActive: true },
    select: { maxStudents: true },
  })
  const currentTotal = existingTopics.reduce((s, t) => s + t.maxStudents, 0)
  if (currentTotal + maxStudents > 8) {
    return NextResponse.json({
      error: `Adding ${maxStudents} would exceed your maximum of 8 students total. You currently have ${currentTotal} allocated.`,
    }, { status: 400 })
  }

  const topic = await prisma.topic.create({
    data: {
      title,
      description: description || null,
      method: JSON.stringify(methods),
      language,
      level,
      programmes: JSON.stringify(programmes),
      specialisations: JSON.stringify(specialisations ?? []),
      maxStudents,
      lecturerId: session!.user.id,
      semesterId: semester.id,
    },
  })

  return NextResponse.json(topic, { status: 201 })
}
