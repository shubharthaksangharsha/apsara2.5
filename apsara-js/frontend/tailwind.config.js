module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: { 
    extend: {
      animation: {
        // Original animations
        subtlePulse: "subtlePulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        subtleFloat: "subtleFloat 3s ease-in-out infinite",
        
        // New enhanced animations for Apsara as celestial dancer
        gracefulDance: "gracefulDance 6s ease-in-out infinite",
        celestialGlow: "celestialGlow 4s ease-in-out infinite",
        innerLight: "innerLight 3s ease-in-out infinite alternate",
        particle: "particle 8s ease-in-out infinite",
        textFade: "textFade 3s ease-in-out infinite alternate",
      },
      keyframes: {
        // Original keyframes
        subtlePulse: {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.05)" },
        },
        subtleFloat: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        
        // New enhanced keyframes
        gracefulDance: {
          "0%": { transform: "rotate(0deg) translateY(0px)" },
          "25%": { transform: "rotate(3deg) translateY(-3px)" },
          "50%": { transform: "rotate(0deg) translateY(0px)" },
          "75%": { transform: "rotate(-3deg) translateY(3px)" },
          "100%": { transform: "rotate(0deg) translateY(0px)" },
        },
        celestialGlow: {
          "0%": { opacity: "0.3", transform: "scale(1.5) rotate(0deg)" },
          "50%": { opacity: "0.5", transform: "scale(1.7) rotate(180deg)" },
          "100%": { opacity: "0.3", transform: "scale(1.5) rotate(360deg)" },
        },
        innerLight: {
          "0%": { opacity: "0.3", transform: "scale(1.1)" },
          "100%": { opacity: "0.5", transform: "scale(1.3)" },
        },
        particle: {
          "0%": { transform: "translate(0, 0) scale(1)", opacity: "0.7" },
          "50%": { transform: "translate(20px, -20px) scale(1.5)", opacity: "1" },
          "100%": { transform: "translate(0, 0) scale(1)", opacity: "0.7" },
        },
        textFade: {
          "0%": { opacity: "0.8" },
          "100%": { opacity: "1" },
        }
      },
    } 
  },
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
