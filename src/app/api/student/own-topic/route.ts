/**
 * Student own-topic proposal API.
 *
 * Students who want to propose their own thesis topic (instead of selecting
 * from the catalogue) use this endpoint to manage their proposal.
 *
 * GET    — fetch the student's current proposal with supervisor request statuses
 * POST   — create or update a draft proposal (title, description, method, language)
 * DELETE — withdraw the proposal (cancels all pending supervisor requests)
 *
 * A student can only have ONE proposal at a time. The proposal goes through
 * a lifecycle: DRAFT → SUBMITTED → MATCHED (or WITHDRAWN).
 * The semesterId is always inferred from the currently active semester.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimit'

export async function GET() {
  const session = await getAuth()
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const proposal = await prisma.ownTopicRequest.findUnique({
    where: { studentId: session.user.id },
    include: {
      supervisorRequests: {
        include: {
          lecturer: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      semester: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(proposal ?? null)
}

export async function POST(req: NextRequest) {
  const session = await getAuth()
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = rateLimit(`api:${session.user.id}`, RATE_LIMITS.api)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const body = await req.json()
  const { title, description, method, language } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (typeof title !== 'string' || title.trim().length > 300) {
    return NextResponse.json({ error: 'Title must be max 300 characters' }, { status: 400 })
  }
  if (description && typeof description === 'string' && description.length > 5000) {
    return NextResponse.json({ error: 'Description must be max 5000 characters' }, { status: 400 })
  }
  if (!method)        return NextResponse.json({ error: 'Method is required' }, { status: 400 })
  if (!language)      return NextResponse.json({ error: 'Language is required' }, { status: 400 })

  const semester = await prisma.semester.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
  if (!semester) return NextResponse.json({ error: 'No active semester' }, { status: 400 })

  // Cannot edit a proposal that is already MATCHED.
  // WITHDRAWN is allowed — the student is re-submitting a new proposal.
  const existing = await prisma.ownTopicRequest.findUnique({ where: { studentId: session.user.id } })
  if (existing?.status === 'MATCHED') {
    return NextResponse.json({ error: 'Cannot edit a matched proposal' }, { status: 400 })
  }

  const proposal = await prisma.ownTopicRequest.upsert({
    where: { studentId: session.user.id },
    create: {
      studentId:  session.user.id,
      semesterId: semester.id,
      title:      title.trim(),
      description: description?.trim() ?? null,
      method,
      language,
      status: 'DRAFT',
    },
    update: {
      title:       title.trim(),
      description: description?.trim() ?? null,
      method,
      language,
      // Re-activate if previously withdrawn, and bind to the current semester
      status:     'DRAFT',
      semesterId: semester.id,
    },
    include: {
      supervisorRequests: {
        include: { lecturer: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  return NextResponse.json(proposal)
}

export async function DELETE() {
  const session = await getAuth()
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const proposal = await prisma.ownTopicRequest.findUnique({ where: { studentId: session.user.id } })
  if (!proposal) return NextResponse.json({ error: 'No proposal found' }, { status: 404 })
  if (proposal.status === 'MATCHED') {
    return NextResponse.json({ error: 'Cannot withdraw a matched proposal' }, { status: 400 })
  }

  // Cancel all pending supervisor requests, then mark proposal as withdrawn
  await prisma.$transaction([
    prisma.ownTopicSupervisorRequest.updateMany({
      where: { ownTopicRequestId: proposal.id, status: 'PENDING' },
      data:  { status: 'WITHDRAWN' },
    }),
    prisma.ownTopicRequest.update({
      where: { id: proposal.id },
      data:  { status: 'WITHDRAWN' },
    }),
  ])

  return NextResponse.json({ ok: true })
}
