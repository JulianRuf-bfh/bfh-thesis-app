import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth
    const path = req.nextUrl.pathname

    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const role = token.role as string

    // Admin can access everything
    if (role === 'ADMIN') return NextResponse.next()

    // Lecturer-only paths
    if (path.startsWith('/lecturer') && role !== 'LECTURER') {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Admin-only paths
    if (path.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Student-only paths
    if (path.startsWith('/student') && role !== 'STUDENT') {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/student/:path*', '/lecturer/:path*', '/admin/:path*'],
}
