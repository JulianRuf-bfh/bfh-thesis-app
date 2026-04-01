// GET  — list all own-topic proposals (optionally filtered by status query param)
// POST — admin manually assigns a supervisor (body: { proposalId, lecturerId })
//        Bypasses the supervisor's own accept/reject flow — useful for edge cases.
//        Follows the same logic as the ACCEPT path in the lecturer route.

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function requireAdmin(session: Awaited<ReturnType<typeof getAuth>>) {
  return session?.user.role === 'ADMIN'
}

export async function GET(req: NextRequest) {
  const session = await getAuth()
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status') // optional filter: DRAFT|SUBMITTED|MATCHED|WITHDRAWN
  const semesterId = req.nextUrl.searchParams.get('semesterId')

  const proposals = await prisma.ownTopicRequest.findMany({
    where: {
      ...(status     ? { status }     : {}),
      ...(semesterId ? { semesterId } : {}),
    },
    include: {
      student: { select: { id: true, name: true, email: true, programme: true, level: true, specialisation: true } },
      semester: { select: { id: true, name: true } },
      supervisorRequests: {
        include: { lecturer: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(proposals)
}

export async function POST(req: NextRequest) {
  const session = await getAuth()
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { proposalId, lecturerId } = await req.json()
  if (!proposalId || !lecturerId) {
    return NextResponse.json({ error: 'proposalId and lecturerId required' }, { status: 400 })
  }

  const proposal = await prisma.ownTopicRequest.findUnique({
    where: { id: proposalId },
    include: {
      student: { select: { id: true, programme: true } },
      semester: true,
    },
  })
  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  if (proposal.status === 'MATCHED') return NextResponse.json({ error: 'Already matched' }, { status: 400 })
  if (proposal.status === 'WITHDRAWN') return NextResponse.json({ error: 'Proposal is withdrawn' }, { status: 400 })

  // Guard: student must not already have a match
  const existingMatch = await prisma.match.findUnique({ where: { studentId: proposal.studentId } })
  if (existingMatch) return NextResponse.json({ error: 'Student already matched' }, { status: 400 })

  const lecturer = await prisma.user.findUnique({
    where: { id: lecturerId },
    select: { id: true, role: true, supervisorCapacity: true },
  })
  if (!lecturer || !['LECTURER', 'ADMIN'].includes(lecturer.role)) {
    return NextResponse.json({ error: 'Lecturer not found' }, { status: 404 })
  }

  // Capacity check (admin overrideable via a future flag — for now enforce the same limit)
  const existingMatchCount = await prisma.match.count({ where: { topic: { lecturerId } } })
  if (existingMatchCount >= lecturer.supervisorCapacity) {
    return NextResponse.json(
      { error: `Lecturer is at supervision capacity (${lecturer.supervisorCapacity})` },
      { status: 400 }
    )
  }

  await prisma.$transaction(async (tx) => {
    const topic = await tx.topic.create({
      data: {
        title:          proposal.title,
        description:    proposal.description ?? null,
        method:         proposal.method,
        language:       proposal.language,
        level:          proposal.student.programme?.startsWith('M') ? 'MASTER' : 'BACHELOR',
        programmes:     proposal.student.programme ? JSON.stringify([proposal.student.programme]) : '[]',
        specialisations: '[]',
        maxStudents:    1,
        isActive:       false,
        semesterId:     proposal.semesterId,
        lecturerId,
      },
    })

    await tx.match.create({
      data: {
        studentId:   proposal.studentId,
        topicId:     topic.id,
        semesterId:  proposal.semesterId,
        matchedRank: 0,
      },
    })

    // Mark the OwnTopicSupervisorRequest for this lecturer as accepted (upsert — may not exist if admin assigns without prior request)
    await tx.ownTopicSupervisorRequest.upsert({
      where: { ownTopicRequestId_lecturerId: { ownTopicRequestId: proposal.id, lecturerId } },
      create: {
        ownTopicRequestId: proposal.id,
        lecturerId,
        status: 'ACCEPTED',
        responseNote: 'Assigned by admin.',
        respondedAt: new Date(),
      },
      update: {
        status: 'ACCEPTED',
        responseNote: 'Assigned by admin.',
        respondedAt: new Date(),
      },
    })

    await tx.ownTopicRequest.update({
      where: { id: proposal.id },
      data:  { status: 'MATCHED' },
    })

    // Cancel remaining pending requests
    await tx.ownTopicSupervisorRequest.updateMany({
      where: { ownTopicRequestId: proposal.id, status: 'PENDING' },
      data:  { status: 'REJECTED', responseNote: 'Admin assigned a different supervisor.', respondedAt: new Date() },
    })
  })

  return NextResponse.json({ ok: true })
}
