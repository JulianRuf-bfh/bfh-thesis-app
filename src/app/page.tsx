import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth'

export default async function Home() {
  const session = await getAuth()
  if (!session) redirect('/login')

  const role = session.user.role
  if (role === 'STUDENT') redirect('/student')
  if (role === 'LECTURER') redirect('/lecturer')
  if (role === 'ADMIN') redirect('/admin')

  redirect('/login')
}
