import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessMatch } from '@/lib/canAccessMatch'

export async function GET(_req: Request, { params }: { params: { matchId: string } }) {
  const session = await getAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!await canAccessMatch(params.matchId, session.user.id, session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const match = await prisma.match.findUnique({
    where: { id: params.matchId },
    include: { progress: true, topic: true, files: { orderBy: { uploadedAt: 'asc' } } },
  })
  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    progress: match.progress ?? {
      proposalSubmitted: false, proposalSubmittedAt: null,
      proposalApproved: false,  proposalApprovedAt: null,
      midtermSubmitted: false,  midtermSubmittedAt: null,
      midtermApproved: false,   midtermApprovedAt: null,
      proposalRejected: false,  proposalRejectedAt: null,
      midtermRejected:  false,  midtermRejectedAt:  null,
      notifyOnUpload: false,
      proposalUploadCount: 0,
      midtermUploadCount: 0,
      finalThesisSubmitted: false,     finalThesisSubmittedAt: null,
      finalThesisApproved: false,      finalThesisApprovedAt: null,
      finalThesisRejected: false,      finalThesisRejectedAt: null,
      finalThesisUploadCount: 0,
      finalPresentationSubmitted: false, finalPresentationSubmittedAt: null,
      finalPresentationApproved: false,  finalPresentationApprovedAt: null,
      finalPresentationRejected: false,  finalPresentationRejectedAt: null,
      finalPresentationUploadCount: 0,
    },
    files: match.files,
  })
}

export async function PATCH(req: Request, { params }: { params: { matchId: string } }) {
  const session = await getAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!await canAccessMatch(params.matchId, session.user.id, session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const match = await prisma.match.findUnique({ where: { id: params.matchId } })
  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowedFields: Record<string, string[]> = {
    STUDENT:  ['proposalSubmitted', 'midtermSubmitted', 'finalThesisSubmitted', 'finalPresentationSubmitted'],
    LECTURER: ['proposalApproved', 'midtermApproved', 'proposalRejected', 'midtermRejected',
               'finalThesisApproved', 'finalThesisRejected', 'finalPresentationApproved', 'finalPresentationRejected', 'notifyOnUpload'],
    ADMIN:    ['proposalSubmitted', 'proposalApproved', 'midtermSubmitted', 'midtermApproved', 'proposalRejected', 'midtermRejected',
               'finalThesisSubmitted', 'finalThesisApproved', 'finalThesisRejected',
               'finalPresentationSubmitted', 'finalPresentationApproved', 'finalPresentationRejected', 'notifyOnUpload'],
  }

  const body = await req.json()
  const allowed = allowedFields[session.user.role] ?? []
  const data: Record<string, boolean | Date | null> = {}

  for (const field of allowed) {
    if (field in body) {
      data[field] = body[field]
      if (field === 'proposalSubmitted')  data.proposalSubmittedAt  = body[field] ? new Date() : null
      if (field === 'proposalApproved')   data.proposalApprovedAt   = body[field] ? new Date() : null
      if (field === 'midtermSubmitted')   data.midtermSubmittedAt   = body[field] ? new Date() : null
      if (field === 'midtermApproved')    data.midtermApprovedAt    = body[field] ? new Date() : null
      if (field === 'proposalRejected')             data.proposalRejectedAt             = body[field] ? new Date() : null
      if (field === 'midtermRejected')              data.midtermRejectedAt              = body[field] ? new Date() : null
      if (field === 'finalThesisSubmitted')         data.finalThesisSubmittedAt         = body[field] ? new Date() : null
      if (field === 'finalThesisApproved')          data.finalThesisApprovedAt          = body[field] ? new Date() : null
      if (field === 'finalThesisRejected')          data.finalThesisRejectedAt          = body[field] ? new Date() : null
      if (field === 'finalPresentationSubmitted')   data.finalPresentationSubmittedAt   = body[field] ? new Date() : null
      if (field === 'finalPresentationApproved')    data.finalPresentationApprovedAt    = body[field] ? new Date() : null
      if (field === 'finalPresentationRejected')    data.finalPresentationRejectedAt    = body[field] ? new Date() : null
      // notifyOnUpload is a plain boolean — no timestamp needed
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No permitted fields to update' }, { status: 400 })
  }

  const progress = await prisma.thesisProgress.upsert({
    where:  { matchId: params.matchId },
    create: { matchId: params.matchId, ...data },
    update: data,
  })

  return NextResponse.json(progress)
}
