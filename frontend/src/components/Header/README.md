# Header Component

The Header component serves as the top navigation bar for the Apsara 2.5 application. It provides access to key functionality including model selection, theme toggle, live session access, settings, and user profile information.

## Usage

```jsx
import Header from '../components/Header';

// Inside your component
<Header
  models={models}
  currentModel={currentModel}
  setCurrentModel={setCurrentModel}
  darkMode={darkMode}
  setDarkMode={setDarkMode}
  sidebarOpen={sidebarOpen}
  setSidebarOpen={setSidebarOpen}
  setLiveOpen={setLiveOpen}
  setSettingsOpen={setSettingsOpen}
  isAuthenticated={isAuthenticated}
  userProfile={userProfile}
  onSignOut={handleSignOut}
/>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `models` | Array | List of available models to select from |
| `currentModel` | String | ID of the currently selected model |
| `setCurrentModel` | Function | Handler to update the selected model |
| `darkMode` | Boolean | Whether dark mode is active |
| `setDarkMode` | Function | Handler to toggle dark mode |
| `sidebarOpen` | Boolean | Whether the sidebar is open |
| `setSidebarOpen` | Function | Handler to toggle the sidebar |
| `setLiveOpen` | Function | Handler to open the live session modal |
| `setSettingsOpen` | Function | Handler to open the settings panel |
| `isAuthenticated` | Boolean | Whether the user is authenticated |
| `userProfile` | Object | User profile data including name and picture |
| `onSignOut` | Function | Handler for signing out |

## Structure

- `index.jsx` - Main component implementation
- `constants.js` - Component-specific constants
- `components/` - Subcomponents
  - `ModelSelector.jsx` - Dropdown for selecting AI models
  - `HeaderButtons.jsx` - Action buttons for theme, live, settings, etc.
  - `ProfileImage.jsx` - User profile image component

## Responsive Behavior

The Header component adapts to different screen sizes:
- On mobile: Hides the app name and user name
- On desktop: Shows full app name and user name 