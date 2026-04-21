import type { Config } from 'tailwindcss'

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
          // Primary: BFH slate-gray (used for buttons, active elements, primary actions)
          red:        'var(--bfh-primary)',
          'red-dark': 'var(--bfh-primary-dark)',
          'red-light': 'var(--bfh-primary-light)',
          // Accent: BFH golden yellow (used for active-tab bg, logo, rank highlights)
          yellow:        'var(--bfh-yellow)',
          'yellow-light': 'var(--bfh-yellow-light)',
          // Neutrals — all backed by CSS variables so dark mode works automatically
          'gray-dark':   'var(--bfh-gray-dark)',
          'gray-mid':    'var(--bfh-gray-mid)',
          'gray-light':  'var(--bfh-gray-light)',
          'gray-border': 'var(--bfh-gray-border)',
          white:         'var(--bfh-white)',
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
