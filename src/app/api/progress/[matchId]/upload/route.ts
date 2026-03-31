import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendUploadNotification } from '@/lib/email'
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimit'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

const DATE_FIELD: Record<string, string> = {
  proposalSubmitted:          'proposalSubmittedAt',
  midtermSubmitted:           'midtermSubmittedAt',
  finalThesisSubmitted:       'finalThesisSubmittedAt',
  finalPresentationSubmitted: 'finalPresentationSubmittedAt',
}
const COUNT_FIELD: Record<string, string> = {
  proposalSubmitted:          'proposalUploadCount',
  midtermSubmitted:           'midtermUploadCount',
  finalThesisSubmitted:       'finalThesisUploadCount',
  finalPresentationSubmitted: 'finalPresentationUploadCount',
}
const REJECTED_FIELD: Record<string, string> = {
  proposalSubmitted:          'proposalRejected',
  midtermSubmitted:           'midtermRejected',
  finalThesisSubmitted:       'finalThesisRejected',
  finalPresentationSubmitted: 'finalPresentationRejected',
}
export const MAX_UPLOADS = 2
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
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

  if (!file || !milestone || !DATE_FIELD[milestone]) {
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
      { error: `File type not allowed. Accepted: ${[...ALLOWED_EXTENSIONS].join(', ')}` },
      { status: 415 }
    )
  }
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'File MIME type not allowed.' },
      { status: 415 }
    )
  }

  // ── Enforce upload limit (bypassed when lecturer requested a rework) ──────
  const countField    = COUNT_FIELD[milestone]
  const rejectedField = REJECTED_FIELD[milestone]
  const currentCount  = match.progress?.[countField] ?? 0
  const isRework      = match.progress?.[rejectedField] ?? false

  if (!isRework && currentCount >= MAX_UPLOADS) {
    return NextResponse.json(
      { error: `Upload limit reached. Maximum ${MAX_UPLOADS} uploads allowed per milestone.` },
      { status: 429 }
    )
  }

  // Save to disk
  const uploadsDir = path.join(process.cwd(), 'uploads', params.matchId)
  const storedName = `${randomUUID()}${ext}`
  try {
    await mkdir(uploadsDir, { recursive: true })
    await writeFile(path.join(uploadsDir, storedName), Buffer.from(await file.arrayBuffer()))
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save file to disk' }, { status: 500 })
  }

  // Create DB record
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

  // Auto-mark milestone submitted + increment upload count
  // If this is a rework, also clear the rejected flag
  await prisma.thesisProgress.upsert({
    where:  { matchId: params.matchId },
    create: {
      matchId: params.matchId,
      [milestone]: true,
      [DATE_FIELD[milestone]]: new Date(),
      [countField]: 1,
      [rejectedField]: false,
    },
    update: {
      [milestone]: true,
      [DATE_FIELD[milestone]]: new Date(),
      [countField]: { increment: 1 },
      [rejectedField]: false,    // clear rejection when student re-uploads
      [`${rejectedField}At`]: null,
    },
  })

  // Send notification if enabled
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

  return NextResponse.json({ ...thesisFile, uploadsUsed: currentCount + 1, uploadsMax: MAX_UPLOADS })
}
