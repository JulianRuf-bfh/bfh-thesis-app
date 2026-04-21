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
    { href: '/student',             label: 'Browse Topics' },
    { href: '/student/my-thesis',   label: 'My Thesis' },
    { href: '/student/result',      label: 'My Result' },
    { href: '/student/progress',    label: 'Thesis Progress' },
  ],
  LECTURER: [
    { href: '/lecturer/topics/new',         label: 'Add Topic' },
    { href: '/lecturer',                    label: 'My Topics' },
    { href: '/lecturer/own-topic-requests', label: 'Topic Requests' },
    { href: '/lecturer/students',           label: 'My Students' },
    { href: '/lecturer/import',             label: 'Import Previous' },
  ],
  ADMIN: [
    { href: '/admin',           label: 'Dashboard' },
    { href: '/admin/semesters', label: 'Semesters' },
    { href: '/admin/topics',    label: 'Topics' },
    { href: '/admin/students',  label: 'Students' },
    { href: '/admin/matching',  label: 'Matching' },
    { href: '/admin/users',     label: 'Users' },
  ],
}

function isActiveLink(
  pathname: string,
  href: string,
  allLinks: { href: string }[]
): boolean {
  if (pathname !== href && !pathname.startsWith(href + '/')) return false
  return !allLinks.some(
    l => l.href !== href && l.href.length > href.length && pathname.startsWith(l.href)
  )
}

// ── ThemeToggle ───────────────────────────────────────────────────────────────
// Fixed: was using light-only classes with no dark: variants — button was
// nearly invisible in dark mode. Now has explicit dark: variants.
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
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded transition-colors',
        // Light mode
        'text-bfh-gray-mid hover:text-bfh-gray-dark hover:bg-bfh-gray-light',
        // Dark mode
        'dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700'
      )}
    >
      {dark ? (
        // Sun — shown in dark mode to switch to light
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
        </svg>
      ) : (
        // Moon — shown in light mode to switch to dark
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <header className={cn(
      'sticky top-0 z-40 border-b shadow-sm',
      'bg-white border-bfh-gray-border',
      'dark:bg-gray-900 dark:border-gray-700'
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <BFHLogo size="sm" />

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  isActiveLink(pathname, href, links)
                    ? 'bg-bfh-yellow text-bfh-gray-dark font-semibold'
                    : cn(
                        'text-bfh-gray-mid hover:text-bfh-gray-dark hover:bg-bfh-gray-light',
                        'dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800'
                      )
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-bfh-gray-dark dark:text-gray-100 leading-tight">
                {session.user.name}
              </div>
              <div className="text-xs text-bfh-gray-mid dark:text-gray-400 leading-tight">
                {role.charAt(0) + role.slice(1).toLowerCase()}
                {session.user.programme && ` · ${session.user.programme}`}
              </div>
            </div>

            {/* Avatar — yellow stays in both modes */}
            <div className="h-8 w-8 rounded-full bg-bfh-yellow flex items-center justify-center text-bfh-gray-dark text-sm font-bold shrink-0">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>

            <ThemeToggle />

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className={cn(
                'text-xs transition-colors',
                'text-bfh-gray-mid hover:text-bfh-slate-dark',
                'dark:text-gray-500 dark:hover:text-gray-300'
              )}
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
                  : cn(
                      'text-bfh-gray-mid hover:bg-bfh-gray-light',
                      'dark:text-gray-400 dark:hover:bg-gray-800'
                    )
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
