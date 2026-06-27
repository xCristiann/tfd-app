import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#07090f',
        bg1: '#0c0f1a',
        bg2: '#111420',
        bg3: '#161b28',
        teal: '#00e5a0',
        teal2: '#00c085',
        violet: '#a78bfa',
        t1: '#eef0f6',
        t2: '#8b92a8',
        t3: '#4e5568',
        green: '#34d399',
        amber: '#fbbf24',
        coral: '#f87171',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
