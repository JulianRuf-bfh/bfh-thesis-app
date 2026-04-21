'use client'
import Link from 'next/link'

// ── WHAT CHANGED ─────────────────────────────────────────────────────────────
//
//  The previous SVG was a hand-drawn approximation of the BFH B-mark.
//  This version uses two approaches:
//
//  1. Nav (sm / md sizes): corrected SVG B-mark only, beside app text.
//     The spine is narrower (~30% of width), bumps are more accurate,
//     F and H are positioned correctly inside the spine.
//
//  2. Login (lg size): the actual official PNG logo (B-mark + "Berner
//     Fachhochschule" text) used as an <img>. Pixel-perfect, no guesswork.
//     Place bfh-logo.png in your /public folder.
//
// ─────────────────────────────────────────────────────────────────────────────

// The B-mark SVG — used in nav (sm/md sizes)
// ViewBox: 56 × 80  (portrait, matches real logo proportions)
// Spine: x=3 → x=19  (~30% of width)
// Top bump: slightly smaller D-curve
// Bottom bump: slightly larger D-curve
// F centred in spine upper half, H centred in spine lower half
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
          'M 7,3',             // top of spine, inside top-left corner
          'Q 3,3 3,7',         // rounded top-left
          'L 3,73',            // left side down
          'Q 3,77 7,77',       // rounded bottom-left
          'L 19,77',           // bottom edge to start of bottom bump
          'C 53,77 53,44 19,44', // bottom bump — larger D, curves right
          'L 19,40',           // notch between bumps
          'C 49,40 49,3 19,3', // top bump — slightly smaller D
          'Z',
        ].join(' ')}
        fill="#6B7D8C"
      />

      {/* F — upper half of spine, centred at x=11 */}
      <text
        x="11" y="24"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#F5C200"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="bold"
        fontSize="17"
      >F</text>

      {/* H — lower half of spine, centred at x=11 */}
      <text
        x="11" y="60"
        textAnchor="middle"
        dominantBaseline="middle"
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
   * 'full'  — B-mark + "Thesis Distribution / Berner Fachhochschule" text (nav default)
   * 'brand' — official PNG (B-mark + "Berner Fachhochschule"), used on login page
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

  // Login page: use the official PNG (place bfh-logo.png in /public)
  if (variant === 'brand') {
    return (
      <Link href="/" className="hover:opacity-90 transition-opacity inline-block">
        <img
          src="/bfh-logo.png"
          alt="Berner Fachhochschule"
          width={size === 'lg' ? 110 : size === 'md' ? 90 : 70}
          style={{ display: 'block' }}
        />
      </Link>
    )
  }

  // Nav: SVG B-mark + app text beside it
  return (
    <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
      <BFHMark width={s.width} height={s.height} />
      <div className="leading-tight">
        <div
          className={`font-bold text-bfh-gray-dark dark:text-gray-100 ${
            size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-xl'
          }`}
        >
          Thesis Distribution
        </div>
        <div
          className={`text-bfh-gray-mid dark:text-gray-400 ${
            size === 'sm' ? 'text-[10px]' : 'text-xs'
          }`}
        >
          Berner Fachhochschule
        </div>
      </div>
    </Link>
  )
}
