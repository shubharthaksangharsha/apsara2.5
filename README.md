# Apsara 2.5 Frontend

A modern, feature-rich conversational AI interface built with React.

## Overview

Apsara 2.5 is an advanced AI assistant application that provides multiple interaction modalities including text, voice, and video. The application features a modular architecture with reusable components and custom hooks for managing application state and functionality.

## Features

- 💬 **Text Chat Interface** with message streaming
- 🎙️ **Voice Interaction** with customizable voices
- 📹 **Video & Screen Sharing** capabilities  
- 🗺️ **Map Integration** for location-based features
- 🌙/☀️ **Dark/Light Mode** support
- 🔄 **Multiple AI Models** with configurable parameters
- 📱 **Responsive Design** for mobile and desktop
- 🔒 **Google Authentication** integration
- 📁 **File Upload** and image handling
- ⚙️ **Customizable Settings** for AI behavior
- 📅 **Google Workspace Integration** for calendar, email, and meetings

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the frontend directory:
   ```
   cd apsara2.5/frontend
   ```
3. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn
   ```

### Running the Application

Development mode:
```
npm run dev
```
or
```
yarn dev
```

Build for production:
```
npm run build
```
or
```
yarn build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/           # UI components
│   │   ├── [ComponentName]/  # Each component in its own directory
│   │   │   ├── index.jsx     # Main component file
│   │   │   ├── constants.js  # Component-specific constants
│   │   │   ├── README.md     # Component documentation
│   │   │   └── components/   # Sub-components
│   ├── hooks/                # Custom React hooks
│   │   ├── [HookName]/       # Each hook in its own directory
│   │   │   ├── index.js      # Main hook file
│   │   │   ├── constants.js  # Hook-specific constants
│   │   │   └── README.md     # Hook documentation
│   ├── utils/                # Utility functions
│   ├── assets/               # Static assets
│   └── App.jsx               # Main application component
├── public/                   # Public assets
├── index.html                # HTML entry point
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # TailwindCSS configuration
└── package.json              # Project dependencies
```

## Component Structure Pattern

Components follow a modular directory structure pattern:

```
ComponentName/
├── index.jsx       # Main component export
├── constants.js    # Component-specific constants and configurations
├── README.md       # Component documentation
└── components/     # Sub-components
    ├── SubComponentA.jsx
    └── SubComponentB.jsx
```

## Core Hooks

- `useTheme` - Manages light/dark mode
- `useAppSettings` - Handles application settings like model parameters
- `useConversations` - Manages chat conversations
- `useChatApi` - Handles communication with the chat backend
- `useFileUpload` - Manages file uploads
- `useLiveSession` - Controls live audio/video sessions
- `useGoogleAuth` - Handles Google authentication

## Technologies

- **React** - UI library
- **TailwindCSS** - Styling
- **Vite** - Build tool
- **Lucide React** - Icon library

## Development Guidelines

1. **Component Modularity** - Keep components focused on a single responsibility
2. **State Management** - Use custom hooks for complex state management
3. **Documentation** - Each component and hook should have its own README.md
4. **Constants Extraction** - Extract magic values to constants files
5. **Responsive Design** - Ensure all components work on various screen sizes

## Live Features Configuration

The application supports various live interaction modes:

- Audio conversations
- Video streaming
- Screen sharing
- Map visualization
- Weather data integration
- Calendar events

## Google Workspace Integration

Apsara 2.5 integrates with Google services to provide productivity features:

### Email Features
- 📨 **Read Emails** - Access and display email content
- ✉️ **Send Emails** - Compose and send new emails
- 📝 **Draft Emails** - Create and save email drafts
- 📎 **Email Attachments** - Handle file attachments in emails

### Calendar Features
- 📅 **View Calendar** - Display upcoming events and appointments
- ➕ **Create Events** - Schedule new calendar events
- 🔄 **Update Events** - Modify existing calendar entries
- 🔔 **Event Reminders** - Set and manage event notifications

### Meeting Features
- 🎦 **Create Meetings** - Schedule Google Meet sessions
- 📋 **List Meetings** - View upcoming and past meetings
- 🔗 **Generate Meeting Links** - Create shareable meeting URLs
- 👥 **Manage Participants** - Add or remove meeting attendees

## Contributing

1. Follow the component structure pattern when creating new components
2. Maintain documentation for all new features
3. Ensure responsive design across all screen sizes
4. Extract reusable logic into custom hooks 