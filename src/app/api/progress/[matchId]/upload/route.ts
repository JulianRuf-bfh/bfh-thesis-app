/**
 * File upload endpoint for thesis milestones.
 *
 * Students upload documents (proposals, midterms, final thesis, presentations)
 * which are stored on disk under uploads/<matchId>/<uuid>.<ext>.
 *
 * Supported milestone keys:
 *   - proposalSubmitted, finalThesisSubmitted, finalPresentationSubmitted
 *     → simple boolean flag + upload count in Progress
 *   - midtermPresentation, midtermPaper
 *     → tracked separately; once BOTH are uploaded midtermSubmitted is set
 *   - midtermReflection
 *     → sets midtermReflectionSubmitted in Progress
 *
 * Security features:
 * - Rate limited (10 uploads per 60 seconds per user)
 * - File size limit (50 MB)
 * - Allowed file types: PDF, Word, PowerPoint, ZIP, text
 * - Upload count per milestone (max 2, reset on rework)
 * - Automatic lecturer notification when enabled
 */

import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendUploadNotification } from '@/lib/email'
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimit'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

/** Maps standard milestone keys → their Progress boolean timestamp fields. */
const DATE_FIELD: Record<string, string> = {
  proposalSubmitted:          'proposalSubmittedAt',
  finalThesisSubmitted:       'finalThesisSubmittedAt',
  finalPresentationSubmitted: 'finalPresentationSubmittedAt',
}

/** Maps standard milestone keys → their upload-count fields in Progress. */
const COUNT_FIELD: Record<string, string> = {
  proposalSubmitted:          'proposalUploadCount',
  finalThesisSubmitted:       'finalThesisUploadCount',
  finalPresentationSubmitted: 'finalPresentationUploadCount',
}

/** Maps standard milestone keys → their rework-request fields in Progress. */
const REJECTED_FIELD: Record<string, string> = {
  proposalSubmitted:          'proposalRejected',
  finalThesisSubmitted:       'finalThesisRejected',
  finalPresentationSubmitted: 'finalPresentationRejected',
}

/** Midterm material milestone keys — together they constitute the midterm submission. */
const MIDTERM_MATERIAL_KEYS = new Set(['midtermPresentation', 'midtermPaper'])

/** Midterm reflection upload key — uploaded after supervisor gives oral feedback. */
const REFLECTION_KEY = 'midtermReflection'

/** All valid milestone strings the client is permitted to send. */
const ALL_VALID_MILESTONES = new Set([
  ...Object.keys(DATE_FIELD),
  ...MIDTERM_MATERIAL_KEYS,
  REFLECTION_KEY,
])

const MAX_UPLOADS    = 2
const MAX_FILE_SIZE  = 50 * 1024 * 1024 // 50 MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/zip',
  'text/plain',
])
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.pptx', '.ppt', '.zip', '.txt',
])

export async function POST(req: Request, { params }: { params: { matchId: string } }) {
  const session = await getAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit uploads per user
  const rl = rateLimit(`upload:${session.user.id}`, RATE_LIMITS.upload)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many uploads. Please try again later.' }, { status: 429 })
  }

  const match = await prisma.match.findUnique({
    where: { id: params.matchId },
    include: {
      topic: { include: { lecturer: { select: { name: true, email: true } } } },
      student: { select: { name: true, email: true } },
      progress: true,
    },
  })
  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.user.role === 'STUDENT' && match.studentId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const file      = formData.get('file') as File | null
  const milestone = formData.get('milestone') as string | null

  if (!file || !milestone || !ALL_VALID_MILESTONES.has(milestone)) {
    return NextResponse.json({ error: 'Missing file or invalid milestone' }, { status: 400 })
  }

  // ── File size validation ──────────────────────────────────────────────────
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.` },
      { status: 413 }
    )
  }

  // ── File type validation ──────────────────────────────────────────────────
  const ext = path.extname(file.name).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: `File type not allowed. Accepted: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}` },
      { status: 415 }
    )
  }
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'File MIME type not allowed.' }, { status: 415 })
  }

  const progress = match.progress as Record<string, unknown> | null

  // ── Upload limit enforcement (varies by milestone type) ───────────────────
  if (MIDTERM_MATERIAL_KEYS.has(milestone)) {
    // Each material type (presentation / paper) has its own upload count
    const existingCount = await prisma.thesisFile.count({
      where: { matchId: params.matchId, milestone },
    })
    const isMidtermRework = (progress?.midtermRejected as boolean) ?? false
    if (!isMidtermRework && existingCount >= MAX_UPLOADS) {
      return NextResponse.json(
        { error: `Upload limit reached for this file type. Maximum ${MAX_UPLOADS} uploads allowed.` },
        { status: 429 }
      )
    }
  } else if (milestone === REFLECTION_KEY) {
    const existingCount = await prisma.thesisFile.count({
      where: { matchId: params.matchId, milestone: REFLECTION_KEY },
    })
    const isReflectionRework = (progress?.midtermReflectionRejected as boolean) ?? false
    if (!isReflectionRework && existingCount >= MAX_UPLOADS) {
      return NextResponse.json(
        { error: `Upload limit reached. Maximum ${MAX_UPLOADS} uploads allowed.` },
        { status: 429 }
      )
    }
  } else {
    // Standard milestones: use Progress count fields
    const countField    = COUNT_FIELD[milestone]
    const rejectedField = REJECTED_FIELD[milestone]
    const currentCount  = (progress?.[countField] as number) ?? 0
    const isRework      = (progress?.[rejectedField] as boolean) ?? false
    if (!isRework && currentCount >= MAX_UPLOADS) {
      return NextResponse.json(
        { error: `Upload limit reached. Maximum ${MAX_UPLOADS} uploads allowed per milestone.` },
        { status: 429 }
      )
    }
  }

  // ── Save file to disk ─────────────────────────────────────────────────────
  const uploadsDir = path.join(process.cwd(), 'uploads', params.matchId)
  const storedName = `${randomUUID()}${ext}`
  try {
    await mkdir(uploadsDir, { recursive: true })
    await writeFile(path.join(uploadsDir, storedName), Buffer.from(await file.arrayBuffer()))
  } catch {
    return NextResponse.json({ error: 'Failed to save file to disk' }, { status: 500 })
  }

  // ── Create file record in DB ──────────────────────────────────────────────
  const thesisFile = await prisma.thesisFile.create({
    data: {
      matchId:      params.matchId,
      milestone,
      originalName: file.name,
      storedName,
      mimeType:     file.type || null,
      size:         file.size,
    },
  })

  // ── Update Progress based on milestone type ───────────────────────────────
  if (MIDTERM_MATERIAL_KEYS.has(milestone)) {
    // After saving the file, check if BOTH types are now present
    const [presCount, paperCount] = await Promise.all([
      prisma.thesisFile.count({ where: { matchId: params.matchId, milestone: 'midtermPresentation' } }),
      prisma.thesisFile.count({ where: { matchId: params.matchId, milestone: 'midtermPaper' } }),
    ])
    const bothReady = presCount > 0 && paperCount > 0

    await prisma.thesisProgress.upsert({
      where:  { matchId: params.matchId },
      create: {
        matchId: params.matchId,
        midtermSubmitted:   bothReady,
        midtermSubmittedAt: bothReady ? new Date() : null,
        midtermRejected:    false,
        midtermRejectedAt:  null,
      },
      update: {
        midtermSubmitted:   bothReady,
        // Only stamp the time the first time both files are ready
        ...(bothReady && !progress?.midtermSubmittedAt ? { midtermSubmittedAt: new Date() } : {}),
        midtermRejected:    false,
        midtermRejectedAt:  null,
      },
    })

  } else if (milestone === REFLECTION_KEY) {
    // Mark reflection submitted and clear any rework flag
    await prisma.thesisProgress.upsert({
      where:  { matchId: params.matchId },
      create: {
        matchId: params.matchId,
        midtermReflectionSubmitted:   true,
        midtermReflectionSubmittedAt: new Date(),
        midtermReflectionRejected:    false,
        midtermReflectionRejectedAt:  null,
      },
      update: {
        midtermReflectionSubmitted:   true,
        midtermReflectionSubmittedAt: new Date(),
        midtermReflectionRejected:    false,
        midtermReflectionRejectedAt:  null,
      },
    })

  } else {
    // Standard milestone: set boolean, timestamp, increment count, clear rework flag
    const countField    = COUNT_FIELD[milestone]
    const rejectedField = REJECTED_FIELD[milestone]
    await prisma.thesisProgress.upsert({
      where:  { matchId: params.matchId },
      create: {
        matchId: params.matchId,
        [milestone]:              true,
        [DATE_FIELD[milestone]]:  new Date(),
        [countField]:             1,
        [rejectedField]:          false,
      },
      update: {
        [milestone]:              true,
        [DATE_FIELD[milestone]]:  new Date(),
        [countField]:             { increment: 1 },
        [rejectedField]:          false,
        [`${rejectedField}At`]:   null,
      },
    })
  }

  // ── Send email notification if lecturer has enabled it ────────────────────
  if (match.progress?.notifyOnUpload) {
    await sendUploadNotification({
      lecturerEmail: match.topic.lecturer.email,
      lecturerName:  match.topic.lecturer.name,
      studentName:   match.student.name,
      topicTitle:    match.topic.title,
      milestone,
      fileName:      file.name,
    })
  }

  return NextResponse.json({ ...thesisFile, uploadsMax: MAX_UPLOADS })
}
