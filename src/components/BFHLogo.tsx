import Link from 'next/link'

export function BFHLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { width: 30, height: 43, titleClass: 'text-sm',  subClass: 'text-[10px]' },
    md: { width: 36, height: 51, titleClass: 'text-base', subClass: 'text-xs' },
    lg: { width: 44, height: 63, titleClass: 'text-xl',  subClass: 'text-xs' },
  }
  const s = sizes[size]

  return (
    <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
      {/*
        SVG viewBox: 56 × 80
        B-shape: left spine with rounded corners + two D-shaped bumps on the right.
        A notch (L 30,42) separates the two bumps, matching the real BFH mark.
      */}
      <svg
        width={s.width}
        height={s.height}
        viewBox="0 0 56 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d={[
            'M 8,4',          // top of spine, just inside left edge
            'Q 4,4 4,8',      // rounded top-left corner
            'L 4,72',         // left side down
            'Q 4,76 8,76',    // rounded bottom-left corner
            'L 30,76',        // bottom edge across to start of bottom bump
            'C 56,76 56,46 30,46', // bottom bump – D-curve bulging right
            'L 30,42',        // notch between the two bumps
            'C 52,42 52,4 30,4',   // top bump – slightly smaller D-curve
            'Z',              // closes top edge back to M (8,4)
          ].join(' ')}
          fill="#6B7D8C"
        />

        {/* "F" — centred in the upper half of the spine */}
        <text
          x="15" y="23"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#F5C200"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="bold"
          fontSize="18"
        >F</text>

        {/* "H" — centred in the lower half of the spine */}
        <text
          x="15" y="60"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#F5C200"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="bold"
          fontSize="18"
        >H</text>
      </svg>

      {/* Text */}
      <div className="leading-tight">
        <div className={`${s.titleClass} font-bold text-bfh-gray-dark`}>Thesis Distribution</div>
        <div className={`${s.subClass} text-bfh-gray-mid`}>Berner Fachhochschule</div>
      </div>
    </Link>
  )
}
