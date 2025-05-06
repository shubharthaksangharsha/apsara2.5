/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // or 'media' based on your preference
  theme: {
    extend: {
      animation: {
        subtlePulse: "subtlePulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        subtleFloat: "subtleFloat 3s ease-in-out infinite",
        dots: "dots 1.5s steps(3, end) infinite",
        shimmer: "shimmer 2s infinite", // Added from sidebar
      },
      keyframes: {
        subtlePulse: {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.05)" },
        },
        subtleFloat: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" }, // Reduced float height
        },
        dots: {
          "0%, 20%": { content: "''" },
          "40%": { content: "'.'" },
          "60%": { content: "'..'" },
          "80%, 100%": { content: "'...'" },
        },
        shimmer: { // Added from sidebar
          '0%': {
            backgroundPosition: '-700px 0',
          },
          '100%': {
            backgroundPosition: '700px 0',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@headlessui/tailwindcss') // If you are using headless UI components
  ],
}; 