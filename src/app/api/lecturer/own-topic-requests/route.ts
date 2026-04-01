// GET  — list all own-topic supervisor requests addressed to me
// PATCH — accept or reject a single request
//   body: { requestId, action: 'accept'|'reject', specialisationFit?: boolean, responseNote?: string }
//
// On ACCEPT:
//   1. Check supervisor capacity (existing primary matches < supervisorCapacity)
//   2. Create a Topic record from the student's proposal data (supervisor is lecturer)
//   3. Create a Match record (matchedRank: 0 — same convention as manual/admin matches)
//   4. Mark the OwnTopicRequest as MATCHED
//   5. Auto-reject all other PENDING requests for this student's proposal
//
// This mirrors the pattern where admin manually creates a Match in the existing workflow.

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getAuth()
  if (!session || !['LECTURER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requests = await prisma.ownTopicSupervisorRequest.findMany({
    where: { lecturerId: session.user.id },
    include: {
      ownTopicRequest: {
        include: {
          student: { select: { id: true, name: true, email: true, programme: true, level: true, specialisation: true } },
          semester: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(requests)
}

export async function PATCH(req: NextRequest) {
  const session = await getAuth()
  if (!session || !['LECTURER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { requestId, action, specialisationFit, responseNote } = await req.json()
  if (!requestId || !['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'requestId and action (accept|reject) required' }, { status: 400 })
  }

  // Load request and verify it belongs to this lecturer
  const request = await prisma.ownTopicSupervisorRequest.findUnique({
    where: { id: requestId },
    include: {
      ownTopicRequest: {
        include: {
          student: { select: { id: true, name: true, programme: true } },
          semester: true,
        },
      },
      lecturer: { select: { id: true, supervisorCapacity: true } },
    },
  })

  if (!request || request.lecturerId !== session.user.id) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }
  if (request.status !== 'PENDING') {
    return NextResponse.json({ error: `Request is already ${request.status}` }, { status: 400 })
  }
  if (request.ownTopicRequest.status !== 'SUBMITTED') {
    return NextResponse.json({ error: 'Proposal is no longer open for responses' }, { status: 400 })
  }

  if (action === 'reject') {
    const updated = await prisma.ownTopicSupervisorRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        responseNote: responseNote?.trim() ?? null,
        respondedAt: new Date(),
      },
    })
    return NextResponse.json(updated)
  }

  // ── ACCEPT ────────────────────────────────────────────────────────────────

  // 1. Capacity check: count existing primary-supervisor matches for this lecturer
  const existingMatchCount = await prisma.match.count({
    where: { topic: { lecturerId: session.user.id } },
  })
  if (existingMatchCount >= request.lecturer.supervisorCapacity) {
    return NextResponse.json(
      { error: `You have reached your supervision capacity (${request.lecturer.supervisorCapacity} students)` },
      { status: 400 }
    )
  }

  // Co-supervisor assignments are intentionally excluded from the capacity count —
  // they carry less workload than primary supervision and are tracked via a separate relation.

  // 2. Check student doesn't already have a Match (shouldn't happen, but guard)
  const existingMatch = await prisma.match.findUnique({
    where: { studentId: request.ownTopicRequest.studentId },
  })
  if (existingMatch) {
    return NextResponse.json({ error: 'Student is already matched' }, { status: 400 })
  }

  const proposal = request.ownTopicRequest

  await prisma.$transaction(async (tx) => {
    // 3. Create a Topic from the student's proposal so the Match can reference it
    //    Using the same semester, with the accepting lecturer as owner.
    const topic = await tx.topic.create({
      data: {
        title:          proposal.title,
        description:    proposal.description ?? null,
        method:         proposal.method,
        language:       proposal.language,
        level:          proposal.student.programme?.startsWith('M') ? 'MASTER' : 'BACHELOR',
        // Store student's programme as the sole target programme
        programmes:     proposal.student.programme ? JSON.stringify([proposal.student.programme]) : '[]',
        specialisations: '[]',
        maxStudents:    1,
        isActive:       false, // not visible in the topic browser — this is a custom topic
        semesterId:     proposal.semesterId,
        lecturerId:     session.user.id,
      },
    })

    // 4. Create a Match — matchedRank: 0 mirrors the convention for non-algorithm matches
    await tx.match.create({
      data: {
        studentId:  proposal.studentId,
        topicId:    topic.id,
        semesterId: proposal.semesterId,
        matchedRank: 0,
      },
    })

    // 5. Mark the OwnTopicRequest as MATCHED and this supervisor request as ACCEPTED
    await tx.ownTopicSupervisorRequest.update({
      where: { id: requestId },
      data: {
        status: 'ACCEPTED',
        specialisationFit: specialisationFit ?? null,
        responseNote: responseNote?.trim() ?? null,
        respondedAt: new Date(),
      },
    })

    await tx.ownTopicRequest.update({
      where: { id: proposal.id },
      data:  { status: 'MATCHED' },
    })

    // 6. Auto-reject all other pending requests for this proposal
    await tx.ownTopicSupervisorRequest.updateMany({
      where: {
        ownTopicRequestId: proposal.id,
        id: { not: requestId },
        status: 'PENDING',
      },
      data: {
        status: 'REJECTED',
        responseNote: 'Another supervisor accepted this student.',
        respondedAt: new Date(),
      },
    })
  })

  return NextResponse.json({ ok: true })
}
