import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** Search for lecturers by name or email (used for co-supervisor picker and student own-topic requests). */
export async function GET(req: NextRequest) {
  const session = await getAuth()
  if (!session || !['STUDENT', 'LECTURER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get('search') ?? ''

  const lecturers = await prisma.user.findMany({
    where: {
      role: { in: ['LECTURER', 'ADMIN'] },
      id:   { not: session.user.id },   // exclude yourself
      ...(q
        ? {
            OR: [
              { name:  { contains: q } },
              { email: { contains: q } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
    take: 20,
  })

  return NextResponse.json(lecturers)
}
