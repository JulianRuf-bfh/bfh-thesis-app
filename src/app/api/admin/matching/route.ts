import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runMatching } from '@/lib/matching'

function requireAdmin(session: Awaited<ReturnType<typeof getAuth>>) {
  return session?.user.role === 'ADMIN'
}

// POST — run the matching algorithm
export async function POST(req: NextRequest) {
  const session = await getAuth()
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { semesterId } = await req.json()
  if (!semesterId) return NextResponse.json({ error: 'semesterId required' }, { status: 400 })

  const semester = await prisma.semester.findUnique({ where: { id: semesterId } })
  if (!semester) return NextResponse.json({ error: 'Semester not found' }, { status: 404 })
  if (!semester.matchingApproved) {
    return NextResponse.json({ error: 'Matching has not been approved by admin yet' }, { status: 400 })
  }

  const result = await runMatching(semesterId)
  return NextResponse.json(result)
}

// GET — fetch current matching results for a semester
export async function GET(req: NextRequest) {
  const session = await getAuth()
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const semesterId = req.nextUrl.searchParams.get('semesterId')
  if (!semesterId) return NextResponse.json({ error: 'semesterId required' }, { status: 400 })

  const matches = await prisma.match.findMany({
    where: { semesterId },
    include: {
      student: { select: { id: true, name: true, email: true, programme: true, level: true } },
      topic: {
        include: { lecturer: { select: { id: true, name: true } } },
      },
      progress: {
        select: {
          proposalSubmitted: true, proposalApproved: true, proposalRejected: true,
          midtermSubmitted: true,  midtermApproved: true,  midtermRejected: true,
          finalThesisSubmitted: true, finalThesisApproved: true, finalThesisRejected: true,
          finalPresentationSubmitted: true, finalPresentationApproved: true, finalPresentationRejected: true,
        },
      },
      grading: { select: { gradingJson: true, aolJson: true, submittedAt: true } },
      coSupervisors: { include: { lecturer: { select: { id: true, name: true } } } },
    },
    orderBy: { matchedAt: 'asc' },
  })

  // Unmatched students: have preferences but no match
  const studentsWithPrefs = await prisma.preference.groupBy({
    by: ['studentId'],
    where: { semesterId },
  })
  const matchedIds = new Set(matches.map(m => m.studentId))
  const unmatchedIds = studentsWithPrefs.map(s => s.studentId).filter(id => !matchedIds.has(id))

  const unmatched = await prisma.user.findMany({
    where: { id: { in: unmatchedIds } },
    select: { id: true, name: true, email: true, programme: true, level: true },
  })

  return NextResponse.json({
    matches: matches.map(m => ({
      matchId: m.id,
      studentId: m.studentId,
      studentName: m.student.name,
      studentEmail: m.student.email,
      programme: m.student.programme,
      level: m.student.level,
      topicId: m.topicId,
      topicTitle: m.topic.title,
      lecturerId: m.topic.lecturer.id,
      lecturerName: m.topic.lecturer.name,
      coSupervisors: m.coSupervisors.map(cs => ({ id: cs.lecturerId, name: cs.lecturer.name })),
      matchedRank: m.matchedRank,
      matchedAt: m.matchedAt.toISOString(),
      progress: m.progress ?? null,
      grading: (() => {
        if (!m.grading) return null
        const CRITERIA  = ['S1','S2','S3','S4','S5','S6','S7','M1','M2']
        const AOL_DIMS  = [
          { id: 'LG_1_1', count: 4 },
          { id: 'LG_4_1', count: 5 },
          { id: 'LO_5_1', count: 5 },
          { id: 'LO_5_2', count: 5 },
        ]
        let gMap: Record<string, any> = {}
        let aMap: Record<string, any> = {}
        try { gMap = JSON.parse(m.grading.gradingJson) } catch {}
        try { aMap = JSON.parse(m.grading.aolJson) } catch {}
        const mainScored  = CRITERIA.filter(id => gMap[id]?.score != null).length
        const aolFilled   = AOL_DIMS.reduce((sum, d) => {
          const arr: (number|null)[] = aMap[d.id] ?? []
          return sum + arr.filter(v => v !== null).length
        }, 0)
        const aolTotal    = AOL_DIMS.reduce((s, d) => s + d.count, 0)
        return {
          mainScored,
          mainTotal:   CRITERIA.length,
          submitted:   !!m.grading.submittedAt,
          submittedAt: m.grading.submittedAt?.toISOString() ?? null,
          aolFilled,
          aolTotal,
        }
      })(),
    })),
    unmatched: unmatched.map(u => ({
      studentId: u.id,
      studentName: u.name,
      studentEmail: u.email,
      programme: u.programme,
      level: u.level,
    })),
  })
}
