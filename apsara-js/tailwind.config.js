module.exports = {
  theme: {
    extend: {
      animation: {
        pulseGlow: 'pulseGlow 2s infinite',
        dots: 'dots 1.5s steps(3, end) infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.7' },
        },
        dots: {
           '0%, 20%': { content: '""' },
           '40%': { content: '"."' },
           '60%': { content: '".."' },
           '80%, 100%': { content: '"..."' },
        },
      },
    },
  },
  plugins: [
  ],
}; 