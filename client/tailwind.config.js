/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tb: {
          bg: '#FFFFFF',
          sidebar: '#F7F7F7',
          card: '#FFFFFF',
          text: '#111111',
          secondary: '#666666',
          muted: '#888888',
          border: '#E5E5E5',
          hover: '#F2F2F2',
          danger: '#DC2626',
          warning: '#D97706',
          success: '#16A34A'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', 'monospace']
      }
    },
  },
  plugins: [],
}
