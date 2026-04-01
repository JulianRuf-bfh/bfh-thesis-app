import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function requireLecturer(session: Awaited<ReturnType<typeof getAuth>>) {
  if (!session) return false
  return session.user.role === 'LECTURER' || session.user.role === 'ADMIN'
}

// PUT — update a topic
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuth()
  if (!requireLecturer(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const topic = await prisma.topic.findUnique({ where: { id: params.id } })
  if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (topic.lecturerId !== session!.user.id && session!.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check deadline
  const semester = await prisma.semester.findUnique({ where: { id: topic.semesterId } })
  if (semester && new Date() > semester.lecturerDeadline && session!.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Lecturer input deadline has passed' }, { status: 400 })
  }

  const body = await req.json()
  const { title, description, methods, language, level, programmes, specialisations, maxStudents, isActive } = body

  // Re-check total capacity if maxStudents changed
  if (maxStudents !== undefined && maxStudents !== topic.maxStudents) {
    if (maxStudents < 1 || maxStudents > 8) {
      return NextResponse.json({ error: 'maxStudents must be 1–8' }, { status: 400 })
    }
    if (semester) {
      const others = await prisma.topic.findMany({
        where: { lecturerId: session!.user.id, semesterId: semester.id, isActive: true, id: { not: params.id } },
        select: { maxStudents: true },
      })
      const othersTotal = others.reduce((s, t) => s + t.maxStudents, 0)
      if (othersTotal + maxStudents > 8) {
        return NextResponse.json({ error: `Would exceed your max of 8 students total (others: ${othersTotal}).` }, { status: 400 })
      }
    }
  }

  const updated = await prisma.topic.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(methods !== undefined && { method: JSON.stringify(methods) }),
      ...(language !== undefined && { language }),
      ...(level !== undefined && { level }),
      ...(programmes !== undefined && { programmes: JSON.stringify(programmes) }),
      ...(specialisations !== undefined && { specialisations: JSON.stringify(specialisations) }),
      ...(maxStudents !== undefined && { maxStudents }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  return NextResponse.json(updated)
}

// DELETE — deactivate a topic (soft delete)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuth()
  if (!requireLecturer(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const topic = await prisma.topic.findUnique({ where: { id: params.id } })
  if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (topic.lecturerId !== session!.user.id && session!.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Lecturers cannot delete topics after matching has run (admins can)
  if (session!.user.role !== 'ADMIN') {
    const semester = await prisma.semester.findUnique({ where: { id: topic.semesterId } })
    if (semester?.matchingRun) {
      return NextResponse.json({ error: 'Matching has already been run — topics are locked' }, { status: 400 })
    }
  }

  await prisma.topic.update({
    where: { id: params.id },
    data: { isActive: false },
  })

  // Remove all preferences for this topic (it vanished)
  await prisma.preference.deleteMany({ where: { topicId: params.id } })

  return NextResponse.json({ ok: true })
}
