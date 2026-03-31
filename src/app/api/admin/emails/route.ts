import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendMatchingEmails } from '@/lib/email'

export async function POST(req: NextRequest) {
  const session = await getAuth()
  if (session?.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { semesterId } = await req.json()
  if (!semesterId) return NextResponse.json({ error: 'semesterId required' }, { status: 400 })

  const semester = await prisma.semester.findUnique({ where: { id: semesterId } })
  if (!semester) return NextResponse.json({ error: 'Semester not found' }, { status: 404 })
  if (!semester.matchingRun) {
    return NextResponse.json({ error: 'Matching has not been run yet' }, { status: 400 })
  }

  await sendMatchingEmails(semesterId)
  return NextResponse.json({ ok: true })
}
