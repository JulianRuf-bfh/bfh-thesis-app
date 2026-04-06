/**
 * Thesis progress API — tracks milestone completion for a student–topic match.
 *
 * GET  — fetch the current progress state (milestones, timestamps, upload counts)
 * PATCH — update progress fields with role-based permissions:
 *   - Students can mark their own milestones (kickoff confirmed, submissions)
 *   - Lecturers can approve/reject submissions and toggle upload notifications
 *   - Admins can modify all fields
 *
 * Each boolean field has a corresponding timestamp field (e.g. proposalSubmitted
 * → proposalSubmittedAt) that is auto-set when toggled.
 *
 * Midterm phase fields:
 *   midtermSubmitted            — set automatically when both presentation + paper uploaded
 *   midtermMeetingCompleted     — lecturer confirms presentation took place
 *   midtermReflectionSubmitted  — set automatically when student uploads reflection doc
 *   midtermReflectionRejected   — lecturer requests rework on the reflection
 *   midtermApproved             — lecturer gives final approval
 *   midtermFeedback             — lecturer's correction note shown to student on rework
 */

import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessMatch } from '@/lib/canAccessMatch'

/** Empty progress object returned when no ThesisProgress record exists yet. */
const EMPTY_PROGRESS = {
  kickoffCompleted: false,              kickoffCompletedAt: null,
  kickoffStudentConfirmed: false,       kickoffStudentConfirmedAt: null,
  proposalSubmitted: false,             proposalSubmittedAt: null,
  proposalMeetingCompleted: false,      proposalMeetingCompletedAt: null,
  proposalMeetingStudentConfirmed: false, proposalMeetingStudentConfirmedAt: null,
  proposalApproved: false,              proposalApprovedAt: null,
  proposalFeedback: null,
  proposalRejected: false,              proposalRejectedAt: null,
  proposalUploadCount: 0,
  midtermSubmitted: false,              midtermSubmittedAt: null,
  midtermMeetingCompleted: false,       midtermMeetingCompletedAt: null,
  midtermReflectionSubmitted: false,    midtermReflectionSubmittedAt: null,
  midtermReflectionRejected: false,     midtermReflectionRejectedAt: null,
  midtermApproved: false,               midtermApprovedAt: null,
  midtermFeedback: null,
  midtermRejected: false,               midtermRejectedAt: null,
  midtermUploadCount: 0,
  notifyOnUpload: false,
  finalThesisSubmitted: false,          finalThesisSubmittedAt: null,
  finalThesisApproved: false,           finalThesisApprovedAt: null,
  finalThesisRejected: false,           finalThesisRejectedAt: null,
  finalThesisUploadCount: 0,
  finalPresentationSubmitted: false,    finalPresentationSubmittedAt: null,
  finalPresentationApproved: false,     finalPresentationApprovedAt: null,
  finalPresentationRejected: false,     finalPresentationRejectedAt: null,
  finalPresentationUploadCount: 0,
}

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
    progress: match.progress ?? EMPTY_PROGRESS,
    files:    match.files,
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

  // Fields each role is permitted to toggle via PATCH
  const allowedBoolFields: Record<string, string[]> = {
    STUDENT: [
      'kickoffStudentConfirmed',
      'proposalSubmitted',
      'proposalMeetingStudentConfirmed',
      'finalThesisSubmitted',
      'finalPresentationSubmitted',
    ],
    LECTURER: [
      'kickoffCompleted',
      'proposalMeetingCompleted', 'proposalApproved', 'proposalRejected',
      'midtermMeetingCompleted', 'midtermApproved', 'midtermRejected',
      'midtermReflectionRejected',
      'finalThesisApproved', 'finalThesisRejected',
      'finalPresentationApproved', 'finalPresentationRejected',
      'notifyOnUpload',
    ],
    ADMIN: [
      'kickoffCompleted', 'kickoffStudentConfirmed',
      'proposalSubmitted', 'proposalMeetingCompleted', 'proposalMeetingStudentConfirmed',
      'proposalApproved', 'proposalRejected',
      'midtermSubmitted', 'midtermMeetingCompleted', 'midtermApproved', 'midtermRejected',
      'midtermReflectionSubmitted', 'midtermReflectionRejected',
      'finalThesisSubmitted', 'finalThesisApproved', 'finalThesisRejected',
      'finalPresentationSubmitted', 'finalPresentationApproved', 'finalPresentationRejected',
      'notifyOnUpload',
    ],
  }
  const allowedStrFields: Record<string, string[]> = {
    LECTURER: ['proposalFeedback', 'midtermFeedback'],
    ADMIN:    ['proposalFeedback', 'midtermFeedback'],
  }

  const body = await req.json()
  const data: Record<string, boolean | string | Date | null> = {}

  // Maps every boolean field to its auto-managed timestamp counterpart
  const timestampMap: Record<string, string> = {
    kickoffCompleted:                'kickoffCompletedAt',
    kickoffStudentConfirmed:         'kickoffStudentConfirmedAt',
    proposalSubmitted:               'proposalSubmittedAt',
    proposalMeetingCompleted:        'proposalMeetingCompletedAt',
    proposalMeetingStudentConfirmed: 'proposalMeetingStudentConfirmedAt',
    proposalApproved:                'proposalApprovedAt',
    proposalRejected:                'proposalRejectedAt',
    midtermSubmitted:                'midtermSubmittedAt',
    midtermMeetingCompleted:         'midtermMeetingCompletedAt',
    midtermReflectionSubmitted:      'midtermReflectionSubmittedAt',
    midtermReflectionRejected:       'midtermReflectionRejectedAt',
    midtermApproved:                 'midtermApprovedAt',
    midtermRejected:                 'midtermRejectedAt',
    finalThesisSubmitted:            'finalThesisSubmittedAt',
    finalThesisApproved:             'finalThesisApprovedAt',
    finalThesisRejected:             'finalThesisRejectedAt',
    finalPresentationSubmitted:      'finalPresentationSubmittedAt',
    finalPresentationApproved:       'finalPresentationApprovedAt',
    finalPresentationRejected:       'finalPresentationRejectedAt',
  }

  for (const field of allowedBoolFields[session.user.role] ?? []) {
    if (field in body) {
      data[field] = body[field]
      if (timestampMap[field]) {
        data[timestampMap[field]] = body[field] ? new Date() : null
      }
    }
  }
  for (const field of allowedStrFields[session.user.role] ?? []) {
    if (field in body) data[field] = body[field] ?? null
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
