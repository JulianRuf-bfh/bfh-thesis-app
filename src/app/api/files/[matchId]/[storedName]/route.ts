/**
 * File download endpoint.
 *
 * Serves thesis files (proposals, midterms, final thesis, presentations)
 * stored on disk. Access is restricted to participants of the match
 * (student, supervisor, co-supervisors) and admins.
 *
 * Security: validates storedName against path traversal, rate-limits
 * downloads, and sanitises the Content-Disposition filename.
 */

import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessMatch } from '@/lib/canAccessMatch'
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimit'
import { readFile } from 'fs/promises'
import path from 'path'
import { getMatchUploadsDir } from '@/lib/uploadsDir'

/** Only allow UUID-based filenames with a safe extension — blocks path traversal. */
const SAFE_STORED_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z]{2,5}$/i

export async function GET(
  _req: Request,
  { params }: { params: { matchId: string; storedName: string } }
) {
  const session = await getAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit downloads per user to prevent abuse
  const rl = rateLimit(`download:${session.user.id}`, RATE_LIMITS.api)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  // Guard against path traversal — storedName must be a UUID with extension
  if (!SAFE_STORED_NAME.test(params.storedName)) {
    return NextResponse.json({ error: 'Invalid file name' }, { status: 400 })
  }

  // Verify the caller has access to this match (student, supervisor, co-supervisor, or admin)
  if (!await canAccessMatch(params.matchId, session.user.id, session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Look up the file record in the database
  const fileRecord = await prisma.thesisFile.findFirst({
    where: { matchId: params.matchId, storedName: params.storedName },
  })
  if (!fileRecord) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Mark file as seen when a lecturer or admin downloads it
  const role = session.user.role
  if (role === 'LECTURER' || role === 'ADMIN') {
    await prisma.thesisFile.update({
      where: { id: fileRecord.id },
      data:  { seenByLecturer: true },
    })
  }

  // Read the file from the uploads directory
  let buffer: Buffer
  try {
    buffer = await readFile(
      path.join(getMatchUploadsDir(params.matchId), params.storedName)
    )
  } catch {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
  }

  // Sanitise the original filename for the Content-Disposition header
  // Remove characters that could break the header or enable injection
  const safeName = fileRecord.originalName.replace(/[^\w.\-() ]/g, '_')

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type':        fileRecord.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeName}"`,
    },
  })
}
