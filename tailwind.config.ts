import type { Config } from 'tailwindcss'

const config: Config = {
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
          red:        '#6B7D8C',
          'red-dark': '#4A5F70',   // hover / pressed state
          'red-light': '#EDF6FF',  // very light tint for hover backgrounds
          // Accent: BFH golden yellow (used for active-tab bg, logo, rank highlights)
          yellow:        '#F5C200',
          'yellow-light': '#FFF8D6',
          // Neutrals
          'gray-dark': '#1A1A1A',
          'gray-mid': '#666666',
          'gray-light': '#F7F7F7',
          'gray-border': '#E0E0E0',
          white: '#FFFFFF',
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
