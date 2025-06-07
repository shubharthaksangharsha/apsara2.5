# StreamingApsaraLogo Component

A visually appealing animated logo component that indicates Apsara's "thinking" state in the Apsara 2.5 application.

## Features

- Beautiful animated Apsara logo with:
  - Celestial aura/glow effect
  - Inner light pulsation
  - Floating light particles
  - Gentle dance animation for the logo itself
- Gradient text with animated ellipsis dots
- Conditional rendering based on visibility prop
- Optimized for performance with CSS animations

## Structure

The component is structured as follows:

```
StreamingApsaraLogo/
├── components/           # Subcomponents
│   └── LightParticles.jsx # Animated particle effects
├── constants.js          # CSS classes and configuration
├── index.jsx             # Main component
└── README.md             # Documentation
```

## Usage

```jsx
import StreamingApsaraLogo from '../components/StreamingApsaraLogo';

// In your component
const [isThinking, setIsThinking] = useState(false);

// Show the logo while waiting for a response
const sendMessage = async () => {
  setIsThinking(true);
  try {
    await fetchResponse();
  } finally {
    setIsThinking(false);
  }
};

// In your JSX
<StreamingApsaraLogo isVisible={isThinking} />
```

## Props

- `isVisible` (boolean): Whether the logo should be displayed

## CSS Requirements

The component relies on several custom CSS animations that should be defined in your global stylesheet:

```css
@keyframes celestialGlow {
  0%, 100% { opacity: 0.4; transform: scale(1.5); }
  50% { opacity: 0.6; transform: scale(1.7); }
}

@keyframes innerLight {
  0%, 100% { opacity: 0.3; transform: scale(1.1); }
  50% { opacity: 0.5; transform: scale(1.25); }
}

@keyframes gracefulDance {
  0%, 100% { transform: translateY(0) rotate(0); }
  25% { transform: translateY(-3px) rotate(-1deg); }
  75% { transform: translateY(2px) rotate(1deg); }
}

@keyframes textFade {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes particle {
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { transform: translateY(-15px) translateX(10px); opacity: 0; }
}

.streaming-dots-animation::after {
  content: "...";
  animation: dotsAnimation 1.5s infinite;
}

@keyframes dotsAnimation {
  0% { content: "."; }
  33% { content: ".."; }
  66% { content: "..."; }
}
```

## Customization

You can customize the appearance of the component by modifying the constants in `constants.js` or by passing additional props to control features like:

- Color schemes
- Animation speeds
- Size of the logo
- Number of particles 