// GET  — fetch the student's current own-topic proposal (with supervisor requests)
// POST — create or update the proposal draft (fields: title, description, method, language)
// DEL  — withdraw the proposal (sets status WITHDRAWN, cancels all PENDING requests)
//
// Unlike the preference workflow, a student can only have ONE proposal at a time.
// The semesterId is always inferred from the active semester (same pattern as preferences).

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  const body = await req.json()
  const { title, description, method, language } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!method)        return NextResponse.json({ error: 'Method is required' }, { status: 400 })
  if (!language)      return NextResponse.json({ error: 'Language is required' }, { status: 400 })

  const semester = await prisma.semester.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
  if (!semester) return NextResponse.json({ error: 'No active semester' }, { status: 400 })

  // Cannot edit a proposal that is already MATCHED or WITHDRAWN
  const existing = await prisma.ownTopicRequest.findUnique({ where: { studentId: session.user.id } })
  if (existing && ['MATCHED', 'WITHDRAWN'].includes(existing.status)) {
    return NextResponse.json({ error: `Cannot edit a proposal with status ${existing.status}` }, { status: 400 })
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
