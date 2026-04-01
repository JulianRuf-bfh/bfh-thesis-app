import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseProgrammes, parseSpecialisations, parseMethods } from '@/lib/utils'
import type { TopicFilters, TopicWithCount } from '@/types'
import { BACHELOR_PROGRAMMES } from '@/types'

export async function GET(req: NextRequest) {
  const session = await getAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const filters: TopicFilters = {
    level:          searchParams.get('level') as any || undefined,
    programme:      searchParams.get('programme') as any || undefined,
    specialisation: searchParams.get('specialisation') as any || undefined,
    language:       searchParams.get('language') as any || undefined,
    lecturerId:     searchParams.get('lecturerId') || undefined,
    search:         searchParams.get('search') || undefined,
  }

  // Get active semester
  const semester = await prisma.semester.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!semester) return NextResponse.json([])

  // Students only see their own level
  const role = session.user.role
  let levelFilter = filters.level
  if (role === 'STUDENT') {
    levelFilter = (session.user.level as any) || undefined
  }

  const topics = await prisma.topic.findMany({
    where: {
      semesterId: semester.id,
      isActive: true,
      ...(levelFilter ? { level: levelFilter } : {}),
      ...(filters.language ? { language: filters.language } : {}),
      ...(filters.lecturerId ? { lecturerId: filters.lecturerId } : {}),
    },
    include: {
      lecturer: { select: { id: true, name: true } },
      _count: { select: { preferences: true, matches: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Filter by programme/specialisation in JS (stored as JSON in SQLite)
  let filtered = topics.filter(t => {
    const progs = parseProgrammes(t.programmes)
    const specs = parseSpecialisations(t.specialisations)

    if (filters.programme && !progs.includes(filters.programme)) return false
    if (filters.specialisation && !specs.includes(filters.specialisation)) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!t.title.toLowerCase().includes(q) && !(t.description ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const result: TopicWithCount[] = filtered.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    methods: parseMethods(t.method),
    language: t.language as any,
    level: t.level as any,
    programmes: parseProgrammes(t.programmes),
    specialisations: parseSpecialisations(t.specialisations) as any[],
    maxStudents: t.maxStudents,
    isActive: t.isActive,
    semesterId: t.semesterId,
    lecturerId: t.lecturerId,
    lecturerName: t.lecturer.name,
    preferenceCount: t._count.preferences,
    matchCount: t._count.matches,
    // Available slots = capacity minus whichever is higher: confirmed matches or reserved preferences
    availableSlots: Math.max(0, t.maxStudents - Math.max(t._count.matches, t._count.preferences)),
    createdAt: t.createdAt.toISOString(),
  }))

  return NextResponse.json(result)
}
