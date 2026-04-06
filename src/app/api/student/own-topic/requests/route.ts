/**
 * Student supervisor request API for own-topic proposals.
 *
 * POST   — send a supervision request to a lecturer
 *           Validates: proposal exists, not already matched/withdrawn,
 *           no duplicate request, lecturer has capacity.
 *           Transitions proposal from DRAFT → SUBMITTED on first request.
 *
 * DELETE — withdraw a pending supervisor request
 *           Only PENDING requests can be withdrawn.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getAuth()
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { lecturerId } = await req.json()
  if (!lecturerId) return NextResponse.json({ error: 'lecturerId required' }, { status: 400 })

  // Proposal must exist and be in a state that allows new requests
  const proposal = await prisma.ownTopicRequest.findUnique({
    where: { studentId: session.user.id },
    include: { supervisorRequests: true },
  })
  if (!proposal) return NextResponse.json({ error: 'No proposal found — save your topic first' }, { status: 400 })
  if (proposal.status === 'MATCHED') return NextResponse.json({ error: 'Already matched' }, { status: 400 })
  if (proposal.status === 'WITHDRAWN') return NextResponse.json({ error: 'Proposal is withdrawn' }, { status: 400 })

  // Prevent duplicate active requests to the same supervisor
  const alreadySent = proposal.supervisorRequests.find(
    r => r.lecturerId === lecturerId && ['PENDING', 'ACCEPTED'].includes(r.status)
  )
  if (alreadySent) return NextResponse.json({ error: 'Request already sent to this supervisor' }, { status: 400 })

  // Verify the target is a LECTURER or ADMIN
  const lecturer = await prisma.user.findUnique({
    where: { id: lecturerId },
    select: { id: true, role: true, name: true, supervisorCapacity: true },
  })
  if (!lecturer || !['LECTURER', 'ADMIN'].includes(lecturer.role)) {
    return NextResponse.json({ error: 'Supervisor not found' }, { status: 404 })
  }

  // Check capacity at request time so students get early feedback.
  // The definitive check still happens on accept; this is a best-effort guard.
  const currentMatchCount = await prisma.match.count({
    where: { topic: { lecturerId } },
  })
  if (currentMatchCount >= lecturer.supervisorCapacity) {
    return NextResponse.json(
      { error: `${lecturer.name} has reached their supervision capacity and cannot take new students at this time` },
      { status: 400 }
    )
  }

  const request = await prisma.$transaction(async (tx) => {
    // Create the supervisor request
    const req = await tx.ownTopicSupervisorRequest.create({
      data: {
        ownTopicRequestId: proposal.id,
        lecturerId,
        status: 'PENDING',
      },
      include: { lecturer: { select: { id: true, name: true, email: true } } },
    })
    // Advance status to SUBMITTED on first request (idempotent — skip if already SUBMITTED)
    if (proposal.status === 'DRAFT') {
      await tx.ownTopicRequest.update({
        where: { id: proposal.id },
        data:  { status: 'SUBMITTED' },
      })
    }
    return req
  })

  return NextResponse.json(request, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getAuth()
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { lecturerId } = await req.json()
  if (!lecturerId) return NextResponse.json({ error: 'lecturerId required' }, { status: 400 })

  const proposal = await prisma.ownTopicRequest.findUnique({ where: { studentId: session.user.id } })
  if (!proposal) return NextResponse.json({ error: 'No proposal found' }, { status: 404 })

  const request = await prisma.ownTopicSupervisorRequest.findUnique({
    where: { ownTopicRequestId_lecturerId: { ownTopicRequestId: proposal.id, lecturerId } },
  })
  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (request.status !== 'PENDING') {
    return NextResponse.json({ error: `Cannot withdraw a request with status ${request.status}` }, { status: 400 })
  }

  await prisma.ownTopicSupervisorRequest.update({
    where: { ownTopicRequestId_lecturerId: { ownTopicRequestId: proposal.id, lecturerId } },
    data:  { status: 'WITHDRAWN' },
  })

  return NextResponse.json({ ok: true })
}
