# EmptyChatContent Component

This component displays the welcome screen when there's no active conversation. It shows a welcome heading and incorporates the `RotatingPrompts` component to suggest conversation starters.

## Usage

```jsx
import EmptyChatContent from '../components/EmptyChatContent';

// Inside your component
<EmptyChatContent 
  allPrompts={suggestedPrompts} 
  onStartChatWithPrompt={handleStartChatWithPrompt} 
/>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `allPrompts` | Array | List of prompt objects to display in the rotating prompts component |
| `onStartChatWithPrompt` | Function | Handler called when a user selects a prompt, with the prompt object as parameter |

## Structure

- `index.jsx` - Main component implementation
- `constants.js` - Constants for text content and animation parameters

## Dependencies

- `RotatingPrompts` - Displays interactive prompt suggestions 