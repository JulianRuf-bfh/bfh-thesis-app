import type { Config } from 'tailwindcss'

// ── COLOR CHANGES ─────────────────────────────────────────────────────────────
//
//  Problem: `bfh-red` was named "red" but is actually slate gray (#6B7D8C).
//  This made btn-primary (which used bg-bfh-red) look passive and muted.
//
//  Strategy: backward-compatible rename.
//  · `bfh-red` kept as-is so existing usages don't break.
//  · New semantic aliases added:
//      bfh-slate / bfh-slate-dark  →  the gray (#6B7D8C / #4A5F70)
//      bfh-navy                    →  dark surface for nav + login (#1C2B36)
//      bfh-yellow-dark             →  CTA hover state (#D4A800)
//  · btn-primary in globals.css now uses bg-bfh-yellow text-bfh-navy
//    instead of bg-bfh-red text-white.
//
// ─────────────────────────────────────────────────────────────────────────────

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bfh: {
          // ── Legacy name kept for backward compat ──
          red:           '#6B7D8C',  // slate gray (not actually red)
          'red-dark':    '#4A5F70',
          'red-light':   '#EDF6FF',

          // ── Semantic slate (same values, correct name) ──
          slate:         '#6B7D8C',
          'slate-dark':  '#4A5F70',
          'slate-light': '#EDF6FF',

          // ── Dark surface: nav bar, login background ──
          navy:          '#1C2B36',
          'navy-light':  '#2A3F50',

          // ── Yellow: primary CTA, active nav, rank badges ──
          yellow:        '#F5C200',
          'yellow-dark': '#D4A800',   // hover state for yellow buttons
          'yellow-light': '#FFF8D6',

          // ── Neutrals (unchanged) ──
          'gray-dark':   '#1A1A1A',
          'gray-mid':    '#666666',
          'gray-light':  '#F7F7F7',
          'gray-border': '#E0E0E0',
          white:         '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
