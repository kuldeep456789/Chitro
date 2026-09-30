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
        brand: {
          blue: '#2563EB',     // Primary blue
          cyan: '#06B6D4',     // Cyan accent
          navy: '#0F172A',     // Deep navy
          bg: '#F8FAFC',       // Main background
          card: '#FFFFFF',     // Card background
          subtext: '#64748B',  // Secondary text
          border: '#E2E8F0',   // Borders
          success: '#16A34A',  // Success
          error: '#DC2626',    // Error
          msgIncoming: '#F1F5F9', // Incoming message bubble
          msgOutgoing: '#DBEAFE', // Outgoing message bubble
        },
        surface: {
          canvas: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          muted: '#F1F5F9',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
