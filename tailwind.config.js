/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a1f',
          dark: '#050510',
          light: '#151530',
          card: 'rgba(20, 20, 50, 0.7)',
        },
        neon: {
          cyan: '#00f0ff',
          pink: '#ff00aa',
          green: '#00ff88',
          yellow: '#ffcc00',
          orange: '#ff6600',
          red: '#ff3366',
          purple: '#8855ff',
        },
        border: {
          DEFAULT: 'rgba(0, 240, 255, 0.3)',
          active: 'rgba(0, 240, 255, 0.8)',
          dark: 'rgba(50, 50, 80, 0.5)',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(0, 240, 255, 0.5), 0 0 20px rgba(0, 240, 255, 0.3)',
        'neon-pink': '0 0 10px rgba(255, 0, 170, 0.5), 0 0 20px rgba(255, 0, 170, 0.3)',
        'neon-green': '0 0 10px rgba(0, 255, 136, 0.5), 0 0 20px rgba(0, 255, 136, 0.3)',
        'neon-yellow': '0 0 10px rgba(255, 204, 0, 0.5), 0 0 20px rgba(255, 204, 0, 0.3)',
        'neon-red': '0 0 10px rgba(255, 51, 102, 0.5), 0 0 20px rgba(255, 51, 102, 0.3)',
        'card': '0 4px 30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'scan-line': 'scan-line 3s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow': {
          '0%': { filter: 'brightness(1)' },
          '100%': { filter: 'brightness(1.3)' },
        },
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(0, 240, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.05) 1px, transparent 1px)",
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-from) 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
};
