import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getMatchAndAuthorise(matchId: string, session: any) {
  const match = await prisma.match.findUnique({
    where:   { id: matchId },
    include: { topic: true },
  })
  if (!match) return { error: 'Match not found', status: 404, match: null }
  if (match.topic.lecturerId !== session.user.id && session.user.role !== 'ADMIN') {
    return { error: 'Forbidden — only the first supervisor can manage co-supervisors', status: 403, match: null }
  }
  return { match, error: null, status: 200 }
}

/** GET — list current co-supervisors for a match */
export async function GET(_req: NextRequest, { params }: { params: { matchId: string } }) {
  const session = await getAuth()
  if (!session || !['LECTURER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const coSupervisors = await prisma.matchCoSupervisor.findMany({
    where:   { matchId: params.matchId },
    include: { lecturer: { select: { id: true, name: true, email: true } } },
    orderBy: { addedAt: 'asc' },
  })

  return NextResponse.json(coSupervisors.map(cs => ({ ...cs.lecturer, addedAt: cs.addedAt })))
}

/** POST — add a co-supervisor to a match */
export async function POST(req: NextRequest, { params }: { params: { matchId: string } }) {
  const session = await getAuth()
  if (!session || !['LECTURER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { error, status, match } = await getMatchAndAuthorise(params.matchId, session)
  if (error || !match) return NextResponse.json({ error }, { status })

  const { lecturerId } = await req.json()
  if (!lecturerId) return NextResponse.json({ error: 'lecturerId required' }, { status: 400 })

  const lecturer = await prisma.user.findUnique({ where: { id: lecturerId } })
  if (!lecturer || !['LECTURER', 'ADMIN'].includes(lecturer.role)) {
    return NextResponse.json({ error: 'User is not a lecturer' }, { status: 400 })
  }
  if (lecturer.id === match.topic.lecturerId) {
    return NextResponse.json({ error: 'Cannot add yourself as co-supervisor' }, { status: 400 })
  }

  const existing = await prisma.matchCoSupervisor.findUnique({
    where: { matchId_lecturerId: { matchId: params.matchId, lecturerId } },
  })
  if (existing) return NextResponse.json({ error: 'Already a co-supervisor for this student' }, { status: 409 })

  await prisma.matchCoSupervisor.create({ data: { matchId: params.matchId, lecturerId } })

  return NextResponse.json({ ok: true, name: lecturer.name, email: lecturer.email })
}

/** DELETE — remove a co-supervisor from a match */
export async function DELETE(req: NextRequest, { params }: { params: { matchId: string } }) {
  const session = await getAuth()
  if (!session || !['LECTURER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { error, status, match } = await getMatchAndAuthorise(params.matchId, session)
  if (error || !match) return NextResponse.json({ error }, { status })

  const { lecturerId } = await req.json()
  await prisma.matchCoSupervisor.deleteMany({
    where: { matchId: params.matchId, lecturerId },
  })

  return NextResponse.json({ ok: true })
}
