import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function requireAdmin(session: Awaited<ReturnType<typeof getAuth>>) {
  return session?.user.role === 'ADMIN'
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuth()
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, lecturerDeadline, studentDeadline, isActive, matchingApproved } = body

  // Only one semester can be active at a time
  if (isActive === true) {
    await prisma.semester.updateMany({ data: { isActive: false } })
  }

  const updated = await prisma.semester.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(lecturerDeadline !== undefined && { lecturerDeadline: new Date(lecturerDeadline) }),
      ...(studentDeadline !== undefined && { studentDeadline: new Date(studentDeadline) }),
      ...(isActive !== undefined && { isActive }),
      ...(matchingApproved !== undefined && { matchingApproved }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuth()
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Cascade deletes topics, preferences, matches via Prisma schema
  await prisma.semester.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
