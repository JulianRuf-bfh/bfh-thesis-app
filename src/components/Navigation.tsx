'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { BFHLogo } from './BFHLogo'
import { cn } from '@/lib/utils'

const navLinks: Record<string, { href: string; label: string }[]> = {
  STUDENT: [
    { href: '/student',              label: 'Browse Topics' },
    { href: '/student/my-thesis',    label: 'My Thesis' },
    { href: '/student/result',       label: 'My Result' },
    { href: '/student/progress',     label: 'Thesis Progress' },
  ],
  LECTURER: [
    { href: '/lecturer/topics/new',           label: 'Add Topic' },
    { href: '/lecturer',                      label: 'My Topics' },
    { href: '/lecturer/own-topic-requests',   label: 'Topic Requests' },
    { href: '/lecturer/students',             label: 'My Students' },
    { href: '/lecturer/import',               label: 'Import Previous' },
  ],
  ADMIN: [
    { href: '/admin',                     label: 'Dashboard' },
    { href: '/admin/semesters',           label: 'Semesters' },
    { href: '/admin/topics',              label: 'Topics' },
    { href: '/admin/students',            label: 'Students' },
    { href: '/admin/matching',            label: 'Matching' },
    { href: '/admin/users',               label: 'Users' },
  ],
}

/**
 * A link is active only if it is the most-specific nav item that matches the current path.
 * e.g. on /student/preferences, only /student/preferences is active — not /student.
 */
function isActiveLink(
  pathname: string,
  href: string,
  allLinks: { href: string }[]
): boolean {
  if (pathname !== href && !pathname.startsWith(href + '/')) return false
  // Active only if no other nav link is longer and also matches
  return !allLinks.some(l => l.href !== href && l.href.length > href.length && pathname.startsWith(l.href))
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <span className="w-7 h-7" />
  const dark = resolvedTheme === 'dark'
  return (
    <button
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-7 h-7 flex items-center justify-center rounded hover:bg-bfh-gray-light transition-colors text-bfh-gray-mid hover:text-bfh-gray-dark"
    >
      {dark ? (
        /* Sun icon */
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
        </svg>
      ) : (
        /* Moon icon */
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}

export function Navigation() {
  const { data: session } = useSession()
  const pathname = usePathname()

  if (!session) return null

  const role = session.user.role as string
  const links = navLinks[role] ?? []

  return (
    <header className="bg-white border-b border-bfh-gray-border shadow-sm sticky top-0 z-40 dark:bg-gray-900 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <BFHLogo size="sm" />

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  isActiveLink(pathname, href, links)
                    ? 'bg-bfh-yellow text-bfh-gray-dark font-semibold'
                    : 'text-bfh-gray-mid hover:text-bfh-gray-dark hover:bg-bfh-gray-light'
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-bfh-gray-dark leading-tight">
                {session.user.name}
              </div>
              <div className="text-xs text-bfh-gray-mid leading-tight">
                {role.charAt(0) + role.slice(1).toLowerCase()}
                {session.user.programme && ` · ${session.user.programme}`}
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-bfh-yellow flex items-center justify-center text-bfh-gray-dark text-sm font-bold">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
            <ThemeToggle />
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-xs text-bfh-gray-mid hover:text-bfh-red transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex gap-1 pb-2 overflow-x-auto">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors',
                isActiveLink(pathname, href, links)
                  ? 'bg-bfh-yellow text-bfh-gray-dark font-semibold'
                  : 'text-bfh-gray-mid hover:bg-bfh-gray-light'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
