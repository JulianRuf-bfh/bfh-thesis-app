/**
 * Email utilities for the BFH Thesis application.
 *
 * Uses Nodemailer with SMTP when configured (SMTP_HOST env var).
 * Falls back to console logging in development when SMTP is not set up.
 *
 * All user-controlled values inserted into HTML templates are escaped
 * to prevent HTML injection.
 */

import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'

/** Escape HTML special characters to prevent injection in email templates. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Create an SMTP transport from environment variables, or null if not configured. */
function getTransport() {
  if (!process.env.SMTP_HOST) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  })
}

/** Send an email via SMTP, or log to console in dev mode. */
async function sendOrLog(to: string, subject: string, html: string) {
  const transport = getTransport()
  if (!transport) {
    console.log('\n── [EMAIL LOG] ──────────────────────────────')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log('Body (HTML stripped):', html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    console.log('─────────────────────────────────────────────\n')
    return
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? 'noreply@bfh.ch',
    to,
    subject,
    html,
  })
}

const MILESTONE_LABELS: Record<string, string> = {
  proposalSubmitted:          'Proposal hand in',
  midtermSubmitted:           'Midterm presentation',
  finalThesisSubmitted:       'Final Thesis',
  finalPresentationSubmitted: 'Final Presentation',
}

/**
 * Notify a lecturer that a student has uploaded a file for a milestone.
 */
export async function sendUploadNotification({
  lecturerEmail,
  lecturerName,
  studentName,
  topicTitle,
  milestone,
  fileName,
}: {
  lecturerEmail: string
  lecturerName:  string
  studentName:   string
  topicTitle:    string
  milestone:     string
  fileName:      string
}) {
  const milestoneLabel = MILESTONE_LABELS[milestone] ?? milestone
  // Escape all user-controlled values before inserting into HTML
  const safeLecturerName = escapeHtml(lecturerName)
  const safeStudentName  = escapeHtml(studentName)
  const safeTopicTitle   = escapeHtml(topicTitle)
  const safeFileName     = escapeHtml(fileName)

  await sendOrLog(
    lecturerEmail,
    `[BFH] New file upload: ${studentName} – ${milestoneLabel}`,
    `
    <p>Dear ${safeLecturerName},</p>
    <p>Your student <strong>${safeStudentName}</strong> has uploaded a file for the milestone <strong>${milestoneLabel}</strong>.</p>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:4px 12px 4px 0;font-weight:600">Topic</td><td>${safeTopicTitle}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:600">File</td><td>${safeFileName}</td></tr>
    </table>
    <p>Please log in to the BFH Thesis portal to review the submission.</p>
    <p>Best regards,<br/>BFH Thesis Office</p>
    `
  )
}

/**
 * Send matching result emails to all matched students and their lecturers
 * for a given semester.
 */
export async function sendMatchingEmails(semesterId: string) {
  const semester = await prisma.semester.findUnique({ where: { id: semesterId } })
  if (!semester) throw new Error('Semester not found')

  const matches = await prisma.match.findMany({
    where: { semesterId },
    include: {
      student: { select: { name: true, email: true } },
      topic: {
        include: {
          lecturer: { select: { name: true, email: true } },
        },
      },
    },
  })

  // ── Student emails ──────────────────────────────────────────────────────────
  const safeSemesterName = escapeHtml(semester.name)
  for (const m of matches) {
    const { student, topic } = m
    const safeStudentName  = escapeHtml(student.name)
    const safeTopicTitle   = escapeHtml(topic.title)
    const safeLecturerName = escapeHtml(topic.lecturer.name)

    await sendOrLog(
      student.email,
      `[BFH] Your thesis topic assignment – ${semester.name}`,
      `
      <p>Dear ${safeStudentName},</p>
      <p>We are pleased to inform you that you have been assigned a thesis topic for <strong>${safeSemesterName}</strong>.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 12px 4px 0;font-weight:600">Topic</td><td>${safeTopicTitle}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600">Supervisor</td><td>${safeLecturerName}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600">Your preference rank</td><td>${m.matchedRank === 0 ? 'Manually assigned' : `${m.matchedRank}. choice`}</td></tr>
      </table>
      <p>Please contact your supervisor to schedule your first meeting.</p>
      <p>Best regards,<br/>BFH Thesis Office</p>
      `
    )
  }

  // ── Lecturer emails (grouped — one email per lecturer listing all their students) ──
  const byLecturer = new Map<string, { lecturerName: string; lecturerEmail: string; rows: string[] }>()
  for (const m of matches) {
    const lid = m.topic.lecturerId
    if (!byLecturer.has(lid)) {
      byLecturer.set(lid, {
        lecturerName: m.topic.lecturer.name,
        lecturerEmail: m.topic.lecturer.email,
        rows: [],
      })
    }
    byLecturer.get(lid)!.rows.push(
      `<tr><td style="padding:4px 12px 4px 0">${escapeHtml(m.student.name)}</td><td>${escapeHtml(m.student.email)}</td><td>${escapeHtml(m.topic.title)}</td></tr>`
    )
  }

  for (const { lecturerName, lecturerEmail, rows } of Array.from(byLecturer.values())) {
    await sendOrLog(
      lecturerEmail,
      `[BFH] Thesis student assignments – ${semester.name}`,
      `
      <p>Dear ${escapeHtml(lecturerName)},</p>
      <p>The following students have been assigned to your thesis topics for <strong>${safeSemesterName}</strong>:</p>
      <table style="border-collapse:collapse">
        <thead><tr style="font-weight:600">
          <th style="padding:4px 12px 4px 0;text-align:left">Student</th>
          <th style="padding:4px 12px 4px 0;text-align:left">Email</th>
          <th style="padding:4px 12px 4px 0;text-align:left">Topic</th>
        </tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
      <p>Best regards,<br/>BFH Thesis Office</p>
      `
    )
  }

  await prisma.semester.update({
    where: { id: semesterId },
    data: { emailsSent: true },
  })
}
