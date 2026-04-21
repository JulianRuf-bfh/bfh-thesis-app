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
          // Primary: BFH slate-gray
          red:          '#6B7D8C',
          'red-dark':   '#4A5F70',
          'red-light':  '#EDF6FF',
          // Accent: BFH golden yellow
          yellow:       '#F5C200',
          'yellow-light': '#FFF8D6',
          // Neutrals
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
