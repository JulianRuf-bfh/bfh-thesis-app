import { prisma } from '@/lib/prisma'

/**
 * Returns true if `userId` (with role `role`) is allowed to access this match's
 * progress data — i.e. is the student, first supervisor, or a co-supervisor.
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
