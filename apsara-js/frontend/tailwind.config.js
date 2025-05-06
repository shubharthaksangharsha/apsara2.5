module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
