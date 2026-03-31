import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseProgrammes, parseSpecialisations, parseMethods } from '@/lib/utils'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const topic = await prisma.topic.findUnique({
    where: { id: params.id },
    include: {
      lecturer: { select: { id: true, name: true, email: true } },
      _count: { select: { preferences: true } },
    },
  })
  if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ...topic,
    methods: parseMethods(topic.method),
    programmes: parseProgrammes(topic.programmes),
    specialisations: parseSpecialisations(topic.specialisations),
    preferenceCount: topic._count.preferences,
    availableSlots: Math.max(0, topic.maxStudents - topic._count.preferences),
    lecturerName: topic.lecturer.name,
  })
}
