/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0a0e27',
        'dark-card': '#1a1f3a',
        'dark-border': '#2a2f4a',
        'neon-blue': '#4dd0e1',      // Më e butë - cyan i zbutur
        'neon-green': '#66bb6a',     // Më e butë - jeshile e zbutur
        'neon-orange': '#ff8a65',    // Më e butë - portokalli i zbutur
        'neon-purple': '#9575cd',    // Më e butë - vjollcë e zbutur
        'accent-blue': '#81d4fa',    // Për tekst më të qartë
        'accent-green': '#a5d6a7',   // Për tekst më të qartë
        'accent-orange': '#ffab91',  // Për tekst më të qartë
        'accent-red': '#ef5350',    // Për gabime dhe infeasible
        'text-primary': '#e0e0e0',   // Tekst kryesor më i qartë
        'text-secondary': '#b0b0b0', // Tekst dytësor
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1629 100%)',
      },
      boxShadow: {
        'glow-blue': '0 0 15px rgba(77, 208, 225, 0.3), 0 0 30px rgba(77, 208, 225, 0.15)',
        'glow-green': '0 0 15px rgba(102, 187, 106, 0.3), 0 0 30px rgba(102, 187, 106, 0.15)',
        'glow-orange': '0 0 15px rgba(255, 138, 101, 0.3), 0 0 30px rgba(255, 138, 101, 0.15)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      },
    },
  },
  plugins: [],
}
