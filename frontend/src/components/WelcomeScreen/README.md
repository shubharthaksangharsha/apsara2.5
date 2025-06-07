# WelcomeScreen Component

The WelcomeScreen component serves as the initial landing page for the Apsara 2.5 application when no active conversation is selected. It provides different views based on the user's authentication state.

## Features

- Displays a welcome message with the application name
- Shows different UI states based on authentication status:
  - Authenticated: Shows personalized greeting and enabled Google tools indicator
  - Auth Skipped: Shows standard welcome and disabled Google tools indicator with sign-in option
  - Not Authenticated: Shows sign-in and skip options
- Displays rotating suggested prompts to help users get started
- Provides a "Start New Chat" button to begin a conversation

## Props

| Prop Name | Type | Description |
|-----------|------|-------------|
| `allPrompts` | Array | List of suggested prompts to display in the RotatingPrompts component |
| `onStartNewChat` | Function | Handler for starting a new empty chat |
| `onStartChatWithPrompt` | Function | Handler for starting a chat with a specific prompt text |
| `isAuthenticated` | Boolean | Whether the user is currently authenticated |
| `userProfile` | Object | User profile information if authenticated (contains name, email, etc.) |
| `onGoogleSignIn` | Function | Handler for initiating Google sign-in flow |
| `onSkipAuth` | Function | Handler for skipping authentication |
| `authSkipped` | Boolean | Whether authentication was explicitly skipped |

## Usage

```jsx
import WelcomeScreen from '../components/WelcomeScreen';

// In your component:
<WelcomeScreen
  allPrompts={suggestedPrompts}
  onStartNewChat={handleStartNewChat}
  onStartChatWithPrompt={startChatWithPrompt}
  isAuthenticated={isAuthenticated}
  userProfile={userProfile}
  onGoogleSignIn={handleGoogleSignIn}
  onSkipAuth={handleSkipAuth}
  authSkipped={authSkipped}
/>
```

## File Structure

- `index.jsx` - Main component implementation
- `constants.js` - Constants used by the component (animation duration, text sizes, button styles)

## Dependencies

- React
- lucide-react (for icons)
- RotatingPrompts component (for displaying suggested prompts) 