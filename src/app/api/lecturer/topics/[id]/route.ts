/**
 * Individual topic management API (update, toggle, delete).
 *
 * PUT    — update topic fields (title, description, capacity, etc.)
 * PATCH  — toggle active/inactive status (deactivating removes student preferences)
 * DELETE — permanently delete a topic (blocked if it has matched students)
 *
 * All endpoints verify ownership (or admin role) and respect semester
 * deadlines and matching locks.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** Maximum combined student capacity across all of a lecturer's active topics. */
const MAX_LECTURER_CAPACITY = 8

/** Allow lecturers and admins to manage topics. */
function requireLecturer(session: Awaited<ReturnType<typeof getAuth>>) {
  if (!session) return false
  return session.user.role === 'LECTURER' || session.user.role === 'ADMIN'
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuth()
  if (!requireLecturer(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const topic = await prisma.topic.findUnique({ where: { id: params.id } })
  if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only the owning lecturer or an admin can edit a topic
  if (topic.lecturerId !== session!.user.id && session!.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { title, description, methods, language, level, programmes, specialisations, maxStudents, isActive } = body

  // ── Input validation ─────────────────────────────────────────────────────
  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0 || title.trim().length > 300)) {
    return NextResponse.json({ error: 'Title must be 1–300 characters' }, { status: 400 })
  }
  if (description !== undefined && typeof description === 'string' && description.length > 5000) {
    return NextResponse.json({ error: 'Description must be max 5000 characters' }, { status: 400 })
  }

  // ── Capacity validation in a transaction to prevent race conditions ──────
  if (maxStudents !== undefined && maxStudents !== topic.maxStudents) {
    if (maxStudents < 1 || maxStudents > MAX_LECTURER_CAPACITY) {
      return NextResponse.json({ error: `maxStudents must be 1–${MAX_LECTURER_CAPACITY}` }, { status: 400 })
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Re-check capacity inside the transaction if maxStudents changed
    if (maxStudents !== undefined && maxStudents !== topic.maxStudents) {
      const others = await tx.topic.findMany({
        where: { lecturerId: session!.user.id, semesterId: topic.semesterId, isActive: true, id: { not: params.id } },
        select: { maxStudents: true },
      })
      const othersTotal = others.reduce((s, t) => s + t.maxStudents, 0)
      if (othersTotal + maxStudents > MAX_LECTURER_CAPACITY) {
        throw new Error(`Would exceed your max of ${MAX_LECTURER_CAPACITY} students total (others: ${othersTotal}).`)
      }
    }

    return tx.topic.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(methods !== undefined && { method: JSON.stringify(methods) }),
        ...(language !== undefined && { language }),
        ...(level !== undefined && { level }),
        ...(programmes !== undefined && { programmes: JSON.stringify(programmes) }),
        ...(specialisations !== undefined && { specialisations: JSON.stringify(specialisations) }),
        ...(maxStudents !== undefined && { maxStudents }),
        ...(isActive !== undefined && { isActive }),
      },
    })
  }).catch((err: Error) => {
    return { error: err.message } as { error: string }
  })

  if ('error' in updated) {
    return NextResponse.json({ error: updated.error }, { status: 400 })
  }

  return NextResponse.json(updated)
}

/**
 * PATCH — toggle a topic between active and inactive.
 * When deactivating, all student preferences for the topic are removed
 * so students aren't left with a hidden topic in their list.
 * Locked after matching has been run (except for admins).
 */
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuth()
  if (!requireLecturer(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const topic = await prisma.topic.findUnique({ where: { id: params.id } })
  if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (topic.lecturerId !== session!.user.id && session!.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Prevent changes after matching (admins can still override)
  if (session!.user.role !== 'ADMIN') {
    const semester = await prisma.semester.findUnique({ where: { id: topic.semesterId } })
    if (semester?.matchingRun) {
      return NextResponse.json({ error: 'Matching has already been run — topics are locked' }, { status: 400 })
    }
  }

  const updated = await prisma.topic.update({
    where: { id: params.id },
    data: { isActive: !topic.isActive },
  })

  // Clean up: remove student preferences when topic becomes invisible
  if (!updated.isActive) {
    await prisma.preference.deleteMany({ where: { topicId: params.id } })
  }

  return NextResponse.json({ ok: true, isActive: updated.isActive })
}

/**
 * DELETE — permanently remove a topic from the database.
 * Blocked if the topic has any matched students (to preserve data integrity).
 * Lecturers cannot delete after matching has been run; admins can always delete.
 * Cascades: removes all student preferences for the topic first.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuth()
  if (!requireLecturer(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const topic = await prisma.topic.findUnique({
    where: { id: params.id },
    include: { _count: { select: { matches: true } } },
  })
  if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (topic.lecturerId !== session!.user.id && session!.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (topic._count.matches > 0) {
    return NextResponse.json({ error: 'Cannot delete a topic that has matched students' }, { status: 400 })
  }

  if (session!.user.role !== 'ADMIN') {
    const semester = await prisma.semester.findUnique({ where: { id: topic.semesterId } })
    if (semester?.matchingRun) {
      return NextResponse.json({ error: 'Matching has already been run — topics are locked' }, { status: 400 })
    }
  }

  // Use a transaction to ensure both preference cleanup and topic deletion succeed together
  await prisma.$transaction([
    prisma.preference.deleteMany({ where: { topicId: params.id } }),
    prisma.topic.delete({ where: { id: params.id } }),
  ])

  return NextResponse.json({ ok: true })
}
