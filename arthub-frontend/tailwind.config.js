module.exports = {
  theme: {
    extend: {
      colors: {
        // Palette sobre et neutre
        primary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        accent: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'artistic': '0 4px 20px -2px rgba(71, 85, 105, 0.15), 0 2px 10px -2px rgba(51, 65, 85, 0.1)',
        'artistic-lg': '0 10px 40px -5px rgba(71, 85, 105, 0.2), 0 4px 20px -4px rgba(51, 65, 85, 0.15)',
      },
      backgroundImage: {
        'artistic-gradient': 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
        'subtle-gradient': 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
};
