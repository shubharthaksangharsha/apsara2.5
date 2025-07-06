# LivePopup Component

This component handles the real-time interaction with the AI in Apsara 2.5. It includes multi-modal interactions (audio, video, screen-sharing) and various tabs for different functionality.

## Directory Structure

```
LivePopup/
├── components/
│   ├── CameraSelectorModal.jsx - Modal for selecting camera devices
│   ├── ChatTab.jsx - Chat tab content display
│   ├── CodeTab.jsx - Code tab content display
│   ├── CreateEventModal.jsx - Modal for creating calendar events
│   ├── Header.jsx - Header section of the popup
│   ├── InputBar.jsx - Input controls for chat
│   ├── LogsPanel.jsx - Event logs display panel
│   ├── MapTab.jsx - Map tab content display
│   ├── MediaControls.jsx - Controls for audio/video/screen sharing
│   ├── MessageHelpers.jsx - Helper functions for message rendering
│   ├── SaveSessionDialog.jsx - Dialog for saving sessions
│   ├── SettingsPanel.jsx - Settings panel for the LivePopup
│   ├── TabBar.jsx - Navigation tabs
│   ├── Tooltip.jsx - Simple tooltip component
│   ├── WeatherTab.jsx - Weather tab content display
│   └── CalendarTab.jsx - Calendar tab content display
├── constants.js - Constants used throughout the component
├── index.js - Main export file
├── index.jsx - Main component file
└── README.md - This documentation file
```

## Component Breakdown

The LivePopup component is divided into several logical sections:

1. **Header** - Shows the title and connection status
2. **TabBar** - Navigation between different tabs (Chat, Code, Map, etc.)
3. **Content Area** - Main display area with different tab content
4. **InputBar** - Text input and media controls
5. **SettingsPanel** - Configuration options for the session
6. **Modals** - Various modals for different interactions

## Props

The component accepts numerous props for controlling its behavior. The main categories are:

- Connection state (connectionStatus, messages, etc.)
- Media state (isRecording, isStreamingVideo, etc.)
- Content data (mapDisplayData, weatherUIData, etc.)
- Handler functions (onSendMessage, onStartVideo, etc.)

## Usage

```jsx
import LivePopup from './components/LivePopup';

// In your component:
<LivePopup 
  connectionStatus={connectionStatus}
  messages={messages}
  onSendMessage={handleSendMessage}
  // ...other props
/>
``` 