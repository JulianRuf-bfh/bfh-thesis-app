/**
 * Lecturer topics API — list and create thesis topics.
 *
 * GET  — returns the lecturer's topics for the active (or specified) semester
 *        with preference/match counts and computed available slots.
 * POST — creates a new topic with capacity validation (max 8 students per
 *        lecturer across all active topics). Uses a transaction to prevent
 *        race conditions on concurrent topic creation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseProgrammes, parseSpecialisations, parseMethods } from '@/lib/utils'

/** Allow lecturers and admins to manage topics. */
function requireLecturer(session: Awaited<ReturnType<typeof getAuth>>) {
  if (!session) return false
  return session.user.role === 'LECTURER' || session.user.role === 'ADMIN'
}

/** Maximum combined student capacity across all of a lecturer's active topics. */
const MAX_LECTURER_CAPACITY = 8

export async function GET(req: NextRequest) {
  const session = await getAuth()
  if (!requireLecturer(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Allow optional semesterId param (used by import flow); default to active semester
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
    // Available slots = capacity minus whichever is higher: confirmed matches or reserved preferences
    availableSlots: Math.max(0, t.maxStudents - Math.max(t._count.matches, t._count.preferences)),
  })))
}

export async function POST(req: NextRequest) {
  const session = await getAuth()
  if (!requireLecturer(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    title, description, methods, language, level,
    programmes, specialisations, maxStudents,
  } = body

  // ── Input validation ─────────────────────────────────────────────────────
  if (!title?.trim() || !methods?.length || !language || !level || !programmes?.length || !maxStudents) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (typeof title !== 'string' || title.trim().length > 300) {
    return NextResponse.json({ error: 'Title must be a string of max 300 characters' }, { status: 400 })
  }
  if (description && typeof description === 'string' && description.length > 5000) {
    return NextResponse.json({ error: 'Description must be max 5000 characters' }, { status: 400 })
  }
  if (maxStudents < 1 || maxStudents > MAX_LECTURER_CAPACITY) {
    return NextResponse.json({ error: `maxStudents must be between 1 and ${MAX_LECTURER_CAPACITY}` }, { status: 400 })
  }

  const semester = await prisma.semester.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!semester) return NextResponse.json({ error: 'No active semester' }, { status: 400 })

  // ── Lock check ───────────────────────────────────────────────────────────
  if (semester.matchingRun) {
    return NextResponse.json({ error: 'Matching has already been run — topics are locked' }, { status: 400 })
  }

  // ── Capacity check + creation in a transaction to prevent race conditions ─
  // Without a transaction, two concurrent requests could both pass the capacity
  // check and exceed the limit.
  const topic = await prisma.$transaction(async (tx) => {
    const existingTopics = await tx.topic.findMany({
      where: { lecturerId: session!.user.id, semesterId: semester.id, isActive: true },
      select: { maxStudents: true },
    })
    const currentTotal = existingTopics.reduce((s, t) => s + t.maxStudents, 0)
    if (currentTotal + maxStudents > MAX_LECTURER_CAPACITY) {
      throw new Error(
        `Adding ${maxStudents} would exceed your maximum of ${MAX_LECTURER_CAPACITY} students total. You currently have ${currentTotal} allocated.`
      )
    }

    return tx.topic.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
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
  }).catch((err: Error) => {
    // Transaction throws on capacity exceeded — return the error message
    return { error: err.message } as { error: string }
  })

  if ('error' in topic) {
    return NextResponse.json({ error: topic.error }, { status: 400 })
  }

  return NextResponse.json(topic, { status: 201 })
}
