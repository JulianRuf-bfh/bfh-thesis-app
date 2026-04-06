/**
 * Match access control helper.
 *
 * Centralised authorisation check used by progress, grading, and file endpoints
 * to verify that the caller has a legitimate relationship to the match.
 */

import { prisma } from '@/lib/prisma'

/**
 * Returns true if the user is allowed to access this match's data.
 * Access is granted to:
 * - Admins (always)
 * - The matched student
 * - The primary supervisor (topic lecturer)
 * - Any co-supervisor assigned to the match
 */
export async function canAccessMatch(
  matchId: string,
  userId:  string,
  role:    string
): Promise<boolean> {
  if (role === 'ADMIN') return true

  const match = await prisma.match.findUnique({
    where:   { id: matchId },
    include: { topic: true, coSupervisors: true },
  })
  if (!match) return false

  if (role === 'STUDENT')  return match.studentId === userId
  if (role === 'LECTURER') {
    return (
      match.topic.lecturerId === userId ||
      match.coSupervisors.some(cs => cs.lecturerId === userId)
    )
  }
  return false
}
