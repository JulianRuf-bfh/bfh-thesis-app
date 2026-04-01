import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessMatch } from '@/lib/canAccessMatch'

export async function GET(
  _req: NextRequest,
  { params }: { params: { matchId: string } },
) {
  const session = await getAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canAccessMatch(params.matchId, session.user.id, session.user.role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const grading = await prisma.thesisGrading.findUnique({
    where: { matchId: params.matchId },
  })

  return NextResponse.json({
    gradingJson:  grading?.gradingJson ?? '{}',
    aolJson:      grading?.aolJson ?? '{}',
    submittedAt:  grading?.submittedAt ?? null,
    updatedAt:    grading?.updatedAt ?? null,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { matchId: string } },
) {
  const session = await getAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'LECTURER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!(await canAccessMatch(params.matchId, session.user.id, session.user.role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { gradingJson, aolJson, submit, resetSubmission } = body as {
    gradingJson?: string; aolJson?: string; submit?: boolean; resetSubmission?: boolean
  }

  if (resetSubmission && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await prisma.thesisGrading.upsert({
    where:  { matchId: params.matchId },
    create: {
      matchId:     params.matchId,
      gradingJson: gradingJson ?? '{}',
      aolJson:     aolJson ?? '{}',
      ...(submit && { submittedAt: new Date() }),
    },
    update: {
      ...(gradingJson !== undefined && { gradingJson }),
      ...(aolJson     !== undefined && { aolJson }),
      ...(submit && { submittedAt: new Date() }),
      ...(resetSubmission && { submittedAt: null }),
    },
  })

  return NextResponse.json({
    gradingJson:  updated.gradingJson,
    aolJson:      updated.aolJson,
    submittedAt:  updated.submittedAt ?? null,
    updatedAt:    updated.updatedAt,
  })
}
