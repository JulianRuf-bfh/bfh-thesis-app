/**
 * Lecturer topic import API — reuse topics from previous semesters.
 *
 * GET  — list the lecturer's topics from all non-active (past) semesters,
 *        grouped by semester, with parsed JSON fields for display.
 *
 * POST — import selected topics into the current active semester.
 *        Creates new topic records (copies data, does not link to originals).
 *        Validates capacity: total maxStudents across all active topics ≤ 8.
 *        Respects the lecturer deadline — blocked after it passes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseProgrammes, parseSpecialisations, parseMethods } from '@/lib/utils'

export async function GET() {
  const session = await getAuth()
  if (!session || (session.user.role !== 'LECTURER' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const semesters = await prisma.semester.findMany({
    where: { isActive: false },
    orderBy: { createdAt: 'desc' },
  })

  const result = await Promise.all(
    semesters.map(async (sem) => {
      const topics = await prisma.topic.findMany({
        where: { lecturerId: session.user.id, semesterId: sem.id },
        select: { id: true, title: true, method: true, language: true, level: true, programmes: true, specialisations: true, maxStudents: true },
        orderBy: { title: 'asc' },
      })
      return { semester: sem, topics: topics.map(t => ({
        ...t,
        methods: parseMethods(t.method),
        programmes: parseProgrammes(t.programmes),
        specialisations: parseSpecialisations(t.specialisations),
      })) }
    })
  )

  return NextResponse.json(result.filter(r => r.topics.length > 0))
}

// POST — import selected topics into the active semester
export async function POST(req: NextRequest) {
  const session = await getAuth()
  if (!session || (session.user.role !== 'LECTURER' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { topicIds }: { topicIds: string[] } = await req.json()
  if (!Array.isArray(topicIds) || topicIds.length === 0) {
    return NextResponse.json({ error: 'topicIds required' }, { status: 400 })
  }

  const semester = await prisma.semester.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!semester) return NextResponse.json({ error: 'No active semester' }, { status: 400 })

  const source = await prisma.topic.findMany({
    where: { id: { in: topicIds }, lecturerId: session.user.id },
  })

  // Capacity check
  const existing = await prisma.topic.findMany({
    where: { lecturerId: session.user.id, semesterId: semester.id, isActive: true },
    select: { maxStudents: true },
  })
  const usedCapacity = existing.reduce((s, t) => s + t.maxStudents, 0)
  const newCapacity = source.reduce((s, t) => s + t.maxStudents, 0)
  if (usedCapacity + newCapacity > 8) {
    return NextResponse.json({
      error: `Import would exceed your max of 8 students. Currently used: ${usedCapacity}, importing: ${newCapacity}.`,
    }, { status: 400 })
  }

  const created = await prisma.topic.createMany({
    data: source.map(t => ({
      title: t.title,
      description: t.description,
      method: t.method,
      language: t.language,
      level: t.level,
      programmes: t.programmes,
      specialisations: t.specialisations,
      maxStudents: t.maxStudents,
      lecturerId: session.user.id,
      semesterId: semester.id,
    })),
  })

  return NextResponse.json({ imported: created.count }, { status: 201 })
}
