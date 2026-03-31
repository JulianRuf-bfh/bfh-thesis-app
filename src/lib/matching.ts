import { prisma } from '@/lib/prisma'

/**
 * Runs the thesis matching algorithm for a given semester.
 *
 * Rules:
 * 1. Students are sorted by priorityDate DAY (earlier = higher priority).
 * 2. Within the same calendar day, order is randomised (lottery).
 * 3. For each student (in that order), assign the highest-ranked available topic.
 * 4. A topic is available if:
 *    - current matches < topic.maxStudents
 *    - topic.lecturer's total current matches < 8
 * 5. Students who cannot be matched (all 4 preferences exhausted) are left unmatched.
 *    They will appear in the admin view for manual resolution.
 *
 * Existing matches for this semester are cleared before re-running.
 */
export async function runMatching(semesterId: string): Promise<{
  matched: number
  unmatched: number
  details: Array<{ studentId: string; studentName: string; topicId: string | null; topicTitle: string | null; rank: number | null }>
}> {
  // 1. Clear existing matches for this semester
  await prisma.match.deleteMany({ where: { semesterId } })

  // 2. Load all preferences for this semester, grouped by student
  const preferences = await prisma.preference.findMany({
    where: { semesterId },
    orderBy: { rank: 'asc' },
    include: {
      student: { select: { id: true, name: true } },
      topic: {
        select: {
          id: true, title: true, maxStudents: true, lecturerId: true, isActive: true,
        },
      },
    },
  })

  // 3. Group preferences by studentId, preserving rank order
  const studentPrefMap = new Map<
    string,
    { studentName: string; priorityDate: Date; prefs: typeof preferences }
  >()

  for (const pref of preferences) {
    if (!studentPrefMap.has(pref.studentId)) {
      studentPrefMap.set(pref.studentId, {
        studentName: pref.student.name,
        priorityDate: pref.priorityDate,
        prefs: [],
      })
    }
    studentPrefMap.get(pref.studentId)!.prefs.push(pref)
  }

  // 4. Sort students: by day asc, then shuffle within same day
  const students = Array.from(studentPrefMap.entries()).map(([id, val]) => ({
    id,
    name: val.studentName,
    priorityDate: val.priorityDate,
    prefs: val.prefs.sort((a, b) => a.rank - b.rank),
  }))

  // Group by date string (YYYY-MM-DD), then shuffle each group
  const byDay = new Map<string, typeof students>()
  for (const s of students) {
    const day = s.priorityDate.toISOString().slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(s)
  }

  const sortedStudents: typeof students = []
  const sortedDays = Array.from(byDay.keys()).sort()
  for (const day of sortedDays) {
    const group = byDay.get(day)!
    // Fisher-Yates shuffle
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[group[i], group[j]] = [group[j], group[i]]
    }
    sortedStudents.push(...group)
  }

  // 5. Track match counts per topic and per lecturer during this run
  const topicMatchCount = new Map<string, number>()
  const lecturerMatchCount = new Map<string, number>()

  const details: Array<{
    studentId: string
    studentName: string
    topicId: string | null
    topicTitle: string | null
    rank: number | null
  }> = []

  const matchesToCreate: Array<{
    studentId: string
    topicId: string
    semesterId: string
    matchedRank: number
  }> = []

  // 6. Matching loop
  for (const student of sortedStudents) {
    let matched = false

    for (const pref of student.prefs) {
      const topic = pref.topic
      if (!topic.isActive) continue

      const topicCount = topicMatchCount.get(topic.id) ?? 0
      const lecturerCount = lecturerMatchCount.get(topic.lecturerId) ?? 0

      if (topicCount < topic.maxStudents && lecturerCount < 8) {
        // Assign this topic
        matchesToCreate.push({
          studentId: student.id,
          topicId: topic.id,
          semesterId,
          matchedRank: pref.rank,
        })
        topicMatchCount.set(topic.id, topicCount + 1)
        lecturerMatchCount.set(topic.lecturerId, lecturerCount + 1)

        details.push({
          studentId: student.id,
          studentName: student.name,
          topicId: topic.id,
          topicTitle: topic.title,
          rank: pref.rank,
        })
        matched = true
        break
      }
    }

    if (!matched) {
      details.push({
        studentId: student.id,
        studentName: student.name,
        topicId: null,
        topicTitle: null,
        rank: null,
      })
    }
  }

  // 7. Bulk-insert matches
  await prisma.match.createMany({ data: matchesToCreate })

  // 8. Mark semester as matching run
  await prisma.semester.update({
    where: { id: semesterId },
    data: { matchingRun: true },
  })

  return {
    matched: matchesToCreate.length,
    unmatched: details.filter((d) => d.topicId === null).length,
    details,
  }
}
