# useLiveSession Hook

This directory contains the modular implementation of the `useLiveSession` hook, which handles real-time communication with the backend AI API via WebSockets.

## Directory Structure

```
useLiveSession/
├── core/                   # Core connection functionality
│   ├── connection-core.js  # Central connection logic
│   ├── connection-setup.js # WebSocket configuration
│   └── session-management.js # Session lifecycle management
├── handlers/               # Message and event handlers
│   ├── message-handlers.js # Main message handler orchestration
│   ├── event-handlers.js   # General events (maps, images, etc.)
│   ├── tool-handlers.js    # Tool-related events
│   ├── content-handlers.js # Model content/responses
│   └── socket-lifecycle-handlers.js # WebSocket lifecycle events
├── features/               # Feature-specific modules
│   ├── audio.js            # Audio recording and playback
│   ├── video.js            # Video streaming
│   ├── messages.js         # Message management
│   ├── screenShare.js      # Screen sharing
│   └── utils.js            # Shared utilities
└── index.js                # Main entry point
```

## Architecture

The hook is structured following a modular approach with clear separation of concerns:

### Core Modules

- **connection-core.js** - Central connection logic and state management
- **connection-setup.js** - WebSocket configuration and URL building
- **session-management.js** - Session lifecycle management (start, end, resume)

### Handler Modules

- **message-handlers.js** - Main message handling orchestration
- **event-handlers.js** - Specific handlers for general events (maps, images, etc.)
- **tool-handlers.js** - Handlers for tool-related events
- **content-handlers.js** - Handlers for model content/responses
- **socket-lifecycle-handlers.js** - WebSocket connection lifecycle events

### Feature Modules

- **audio.js** - Audio recording and playback
- **video.js** - Video streaming
- **messages.js** - Message management
- **screenShare.js** - Screen sharing
- **utils.js** - Shared utilities

## Data Flow

1. The `index.js` initializes all modules and composes them together
2. User actions call methods exposed by `index.js`
3. Communication flows through the WebSocket connection
4. Incoming messages are routed to the appropriate handlers
5. State updates are propagated back to the UI

## Key Features

- Real-time communication with AI models
- Audio recording and playback
- Video streaming
- Screen sharing
- Contextual UI components (maps, weather, calendar)
- Session management with resumption capabilities 