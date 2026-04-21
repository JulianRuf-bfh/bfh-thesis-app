'use client'
import Link from 'next/link'

// ── Logo strategy ─────────────────────────────────────────────────────────────
//
//  We no longer use the PNG for any variant. The official PNG contains
//  slate-gray elements that become invisible on dark backgrounds (no good
//  filter trick preserves the yellow F/H + gray mark correctly in dark mode).
//
//  Instead, the SVG B-mark is used everywhere:
//  · variant="full"  — mark beside "Thesis Distribution / Berner Fachhochschule"
//                      (used in nav)
//  · variant="brand" — mark above "Berner Fachhochschule" (stacked, used on login)
//
//  Both variants adapt correctly to dark mode via Tailwind dark: classes.
//
//  SVG B-mark path notes (viewBox 0 0 56 80):
//  · Spine: x=3 → x=19 (~30% of total width, matching the real BFH mark)
//  · Top bump: slightly smaller D-curve (C 49,40 49,3 19,3)
//  · Bottom bump: slightly larger D-curve (C 53,77 53,44 19,44)
//  · F centred in upper spine at (11, 24), H at (11, 60)
//  · Hardcoded fill colors — BFH slate + yellow never change between modes
// ─────────────────────────────────────────────────────────────────────────────

function BFHMark({ width, height }: { width: number; height: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 56 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d={[
          'M 7,3',
          'Q 3,3 3,7',
          'L 3,73',
          'Q 3,77 7,77',
          'L 19,77',
          'C 53,77 53,44 19,44',
          'L 19,40',
          'C 49,40 49,3 19,3',
          'Z',
        ].join(' ')}
        fill="#6B7D8C"
      />
      <text
        x="11" y="24"
        textAnchor="middle" dominantBaseline="middle"
        fill="#F5C200"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="bold"
        fontSize="17"
      >F</text>
      <text
        x="11" y="60"
        textAnchor="middle" dominantBaseline="middle"
        fill="#F5C200"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="bold"
        fontSize="17"
      >H</text>
    </svg>
  )
}

interface BFHLogoProps {
  size?: 'sm' | 'md' | 'lg'
  /**
   * 'full'  — mark beside text (horizontal) — for nav bar
   * 'brand' — mark above text (stacked)     — for login page
   */
  variant?: 'full' | 'brand'
}

const markSizes = {
  sm: { width: 28, height: 40 },
  md: { width: 34, height: 49 },
  lg: { width: 44, height: 63 },
}

export function BFHLogo({ size = 'md', variant = 'full' }: BFHLogoProps) {
  const s = markSizes[size]

  if (variant === 'brand') {
    // Stacked layout for login — mark on top, institution name below
    return (
      <Link href="/" className="inline-flex flex-col items-center gap-3 hover:opacity-90 transition-opacity">
        <BFHMark width={markSizes.lg.width} height={markSizes.lg.height} />
        <div className="text-center leading-tight">
          <div className="text-base font-bold text-bfh-gray-dark dark:text-gray-100">
            Thesis Distribution
          </div>
          <div className="text-xs text-bfh-gray-mid dark:text-gray-400 mt-0.5">
            Berner Fachhochschule
          </div>
        </div>
      </Link>
    )
  }

  // Horizontal layout for nav
  return (
    <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
      <BFHMark width={s.width} height={s.height} />
      <div className="leading-tight">
        <div className={`font-bold text-bfh-gray-dark dark:text-gray-100 ${
          size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-xl'
        }`}>
          Thesis Distribution
        </div>
        <div className={`text-bfh-gray-mid dark:text-gray-400 ${
          size === 'sm' ? 'text-[10px]' : 'text-xs'
        }`}>
          Berner Fachhochschule
        </div>
      </div>
    </Link>
  )
}
