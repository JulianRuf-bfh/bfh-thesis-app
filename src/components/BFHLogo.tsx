'use client'
import Link from 'next/link'

// ── Logo strategy ─────────────────────────────────────────────────────────────
//
//  variant="full"  (nav bar):
//    Official bfh-logo.png at fixed height, beside "Thesis Distribution" text.
//    Dark mode: CSS brightness filter lifts the gray B-mark so it stays
//    visible against the dark nav background. The yellow F/H are unaffected
//    in practice (they become slightly brighter, still look good).
//    Filter value brightness(1.8): #6B7D8C → ~#C1D5E5 — clearly visible.
//
//  variant="brand" (login page):
//    SVG B-mark stacked above text. SVG colors are hardcoded so they work
//    in both modes without any filter.
//
// ─────────────────────────────────────────────────────────────────────────────

// Heights for the PNG in the nav bar — keeps it proportional at each size
const pngHeights = { sm: 34, md: 40, lg: 50 }

interface BFHLogoProps {
  size?: 'sm' | 'md' | 'lg'
  /**
   * 'full'  — official PNG beside "Thesis Distribution" text (nav)
   * 'brand' — SVG mark stacked above text (login page)
   */
  variant?: 'full' | 'brand'
}

const markSizes = {
  sm: { width: 28, height: 40 },
  md: { width: 34, height: 49 },
  lg: { width: 44, height: 63 },
}

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
      <text x="11" y="24" textAnchor="middle" dominantBaseline="middle"
        fill="#F5C200" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" fontSize="17">F</text>
      <text x="11" y="60" textAnchor="middle" dominantBaseline="middle"
        fill="#F5C200" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" fontSize="17">H</text>
    </svg>
  )
}

export function BFHLogo({ size = 'md', variant = 'full' }: BFHLogoProps) {
  if (variant === 'brand') {
    // Login page — stacked SVG mark + text, works in both modes
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

  // Nav bar — official PNG + app title
  // dark:brightness-[1.8] lifts the slate-gray mark to be visible on dark:bg-gray-900
  return (
    <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
      <img
        src="/bfh-logo.png"
        alt="Berner Fachhochschule"
        style={{ height: `${pngHeights[size]}px`, width: 'auto' }}
        className="dark:brightness-[1.8]"
      />
      <div className="leading-tight border-l border-bfh-gray-border dark:border-gray-700 pl-3">
        <div className={`font-bold text-bfh-gray-dark dark:text-gray-100 ${
          size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-xl'
        }`}>
          Thesis Distribution
        </div>
      </div>
    </Link>
  )
}
