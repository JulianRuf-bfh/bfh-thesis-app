import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

function requireAdmin(session: Awaited<ReturnType<typeof getAuth>>) {
  return session?.user.role === 'ADMIN'
}

export async function GET(req: NextRequest) {
  const session = await getAuth()
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = req.nextUrl.searchParams.get('role')
  const users = await prisma.user.findMany({
    where: role ? { role } : undefined,
    select: {
      id: true, name: true, email: true, role: true,
      level: true, programme: true, specialisation: true,
      studentId: true, createdAt: true,
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getAuth()
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, email, password, role, level, programme, specialisation, studentId } = body

  if (!name || !email || !role) {
    return NextResponse.json({ error: 'name, email, role required' }, { status: 400 })
  }

  const user = await prisma.user.create({
    data: {
      name, email, role,
      password: password ? await hash(password, 10) : null,
      level: level || null,
      programme: programme || null,
      specialisation: specialisation || null,
      studentId: studentId || null,
    },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json(user, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getAuth()
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, role, level, programme, specialisation, name } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(role !== undefined && { role }),
      ...(level !== undefined && { level }),
      ...(programme !== undefined && { programme }),
      ...(specialisation !== undefined && { specialisation }),
    },
    select: { id: true, name: true, email: true, role: true, level: true, programme: true },
  })

  return NextResponse.json(updated)
}
