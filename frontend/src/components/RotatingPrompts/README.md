# RotatingPrompts Component

A component that displays rotating prompt suggestions to inspire user input in the Apsara 2.5 application.

## Features

- Displays a configurable number of prompt suggestions
- Automatically rotates prompts at regular intervals
- Smooth opacity transitions between prompt sets
- Intelligent rotation to avoid showing the same prompts consecutively
- Responsive grid layout (single column on mobile, two columns on larger screens)
- Icons for each prompt type

## Structure

The component is structured as follows:

```
RotatingPrompts/
├── components/             # Subcomponents
│   └── PromptButton.jsx    # Individual prompt button
├── constants.js            # Configuration constants
├── index.jsx               # Main component
└── README.md               # Documentation
```

## Usage

```jsx
import RotatingPrompts from '../components/RotatingPrompts';

// Sample prompts data
const samplePrompts = [
  { text: "Write a poem about a cybernetic forest", icon: PenTool },
  { text: "Explain quantum computing to a 5-year old", icon: BrainCircuit },
  { text: "Generate 5 science fiction story ideas", icon: Sparkles },
  // Add more prompts as needed
];

// In your component
const handlePromptClick = (promptText, modelId, toolUsage) => {
  setMessageInput(promptText);
  // Optionally use modelId or toolUsage if provided
};

// In your JSX
<RotatingPrompts 
  allPrompts={samplePrompts}
  onPromptClick={handlePromptClick}
/>
```

## Props

- `allPrompts` (array): An array of prompt objects (default: `[]`)
- `onPromptClick` (function): Handler function called when a prompt is clicked

## Prompt Data Format

Each prompt object should have the following structure:

```js
{
  text: "The prompt text to display",
  icon: BrainCircuit, // Optional: Lucide React icon component (defaults to BrainCircuit)
  modelId: "specific-model-id", // Optional: To use a specific model for this prompt
  toolUsage: { ... } // Optional: Any tool usage configurations
}
```

## Configuration

The component's behavior can be configured by modifying constants in `constants.js`:

- `ROTATION_INTERVAL_MS`: Time between rotations (default: 5000ms)
- `PROMPTS_TO_SHOW`: Number of prompts to display at once (default: 4)
- `FADE_OUT_DURATION_MS`: Duration of fade out animation (default: 300ms)
- `FADE_IN_DURATION_MS`: Duration of fade in animation (default: 300ms) 