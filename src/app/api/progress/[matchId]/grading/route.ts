/**
 * Grading API for a specific thesis match.
 *
 * GET  — fetch the current grading data (criteria scores + AoL assessment)
 * PATCH — save or submit grading data (lecturers and admins only)
 *
 * Grading data is stored as JSON strings in the database:
 * - gradingJson: scoring criteria (S1–S7, M1–M2) with numeric scores
 * - aolJson: Assurance of Learning dimensions with indicator ratings
 *
 * Access is restricted to match participants via canAccessMatch().
 * Only admins can reset a submitted grading (resetSubmission flag).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessMatch } from '@/lib/canAccessMatch'

/** Maximum allowed size for grading JSON payloads (100 KB). */
const MAX_JSON_SIZE = 100_000

/** Validate that a string is valid JSON and within size limits. */
function isValidJson(str: string): boolean {
  if (str.length > MAX_JSON_SIZE) return false
  try { JSON.parse(str); return true } catch { return false }
}

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

  // Only lecturers and admins can grade
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

  // Only admins may reset a submitted grading back to draft
  if (resetSubmission && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Validate JSON payloads — must be valid JSON and within size limits
  if (gradingJson !== undefined && (typeof gradingJson !== 'string' || !isValidJson(gradingJson))) {
    return NextResponse.json({ error: 'Invalid gradingJson — must be valid JSON under 100 KB' }, { status: 400 })
  }
  if (aolJson !== undefined && (typeof aolJson !== 'string' || !isValidJson(aolJson))) {
    return NextResponse.json({ error: 'Invalid aolJson — must be valid JSON under 100 KB' }, { status: 400 })
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
