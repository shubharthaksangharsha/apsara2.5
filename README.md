# Apsara 2.5

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/shubharthaksangharsha/apsara2.5)
[![Version](https://img.shields.io/badge/version-2.5.2-green)](https://github.com/shubharthaksangharsha/apsara2.5)
[![License](https://img.shields.io/badge/license-ISC-orange)](https://github.com/shubharthaksangharsha/apsara2.5)

Apsara 2.5 is an advanced AI assistant application leveraging Google's Gemini API to provide interactive chat, live conversation, and multimodal capabilities. This application combines the power of large language models with a user-friendly interface to deliver a comprehensive AI assistant experience.

## Application Gallery

<div align="center">

| Chat Interface | Live Session |
|:---:|:---:|
| ![Main Chat Interface](./screenshots/main_chat_interface.jpeg) | ![Live Session Active](./screenshots/live_session_active.jpeg) |
| *AI-powered chat with sidebar navigation* | *Real-time conversation with video capabilities* |

</div>

<details>
<summary><b>View More Screenshots</b></summary>

### Welcome and Login
<div align="center">

| Welcome Screen | Google Sign-in |
|:---:|:---:|
| ![Welcome Screen](./screenshots/welcome_screen_suggestions1.jpeg) | ![Login Screen](./screenshots/login_screen.jpeg) |
| *AI task suggestions* | *Google authentication* |

</div>

### Advanced Features
<div align="center">

| Code Generation | API Integration |
|:---:|:---:|
| ![Code Execution](./screenshots/code_execution_example.jpeg) | ![API Results](./screenshots/api_results_example.jpeg) |
| *Code generation with visualization* | *Structured API results* |

</div>

### Live Session Settings
<div align="center">

| Session Configuration | Native Audio |
|:---:|:---:|
| ![Session Settings](./screenshots/live_session_settings.jpeg) | ![Audio Settings](./screenshots/native_audio_settings.jpeg) |
| *Tool configuration* | *Audio quality options* |

</div>

</details>

## Project Overview

Apsara 2.5 is a full-stack JavaScript application with the following architecture:
- **Frontend**: React-based single-page application with Tailwind CSS and modular component structure
- **Backend**: Node.js/Express server with domain-driven design integrating with Google Gemini API
- **Communication**: REST API and WebSocket for real-time interactions
- **Authentication**: Google OAuth for personalized experiences and Google Workspace integration

## Key Features

### Core Capabilities
- **Chat Interface**: Traditional text-based chat with Gemini
- **Live Conversation**: Real-time audio, video, and screen sharing with AI
- **Google Authentication**: OAuth integration for personalized experiences
- **Multimodal Input/Output**: Support for text, images, audio, and video
- **Image Generation**: Create and edit images using natural language prompts
- **Persistent Storage**: Save and restore conversations
- **Thinking Mode**: View the AI's reasoning process for complex responses

### Google Workspace Integration
- **Gmail**
  - 📨 **Read Emails** - Access and display email content
  - ✉️ **Send Emails** - Compose and send new emails
  - 📝 **Draft Emails** - Create and save email drafts
  - 📎 **Email Attachments** - Handle file attachments in emails

- **Calendar**
  - 📅 **View Calendar** - Display upcoming events and appointments
  - ➕ **Create Events** - Schedule new calendar events
  - 🔄 **Update Events** - Modify existing calendar entries
  - 🔔 **Event Reminders** - Set and manage event notifications

- **Meeting**
  - 🎦 **Create Meetings** - Schedule Google Meet sessions
  - 📋 **List Meetings** - View upcoming and past meetings
  - 🔗 **Generate Meeting Links** - Create shareable meeting URLs
  - 👥 **Manage Participants** - Add or remove meeting attendees

### Additional Tools
- **Weather Information**: Get current weather for locations
- **Note-Taking**: Create and manage notes during AI interactions
- **Tab Switching**: Control application behavior during live sessions
- **Image Generation**: Create and edit images using Gemini's image generation model
- **URL Context Tool**: Extract and analyze content from web pages
- **Code Execution**: Generate and run code examples
- **Battery Status**: Check system battery level

### User Experience
- **Theme Support**: Light and dark mode
- **Responsive Design**: Works on desktop and mobile devices
- **Streaming Responses**: Real-time text generation
- **File Uploads**: Share files with the AI assistant
- **Session Management**: Save and restore AI conversations
- **Code Highlighting**: Proper formatting for code in responses
- **Model Selection**: Choose from multiple Gemini models
- **Voice Selection**: Multiple voice options for audio responses

## Project Structure

### Backend Architecture
```
backend/
├── config/              # Application configuration
├── middleware/          # Express middleware
├── routes/              # API routes
├── services/            # Business logic
│   ├── ai/              # AI services
│   ├── google/          # Google API integrations
│   └── tools/           # AI tool implementations
├── utils/               # Helper utilities
├── websocket/           # WebSocket handlers
├── uploads/             # Uploaded files directory
├── public/              # Static files
└── index.js             # Application entry point
```

### Frontend Architecture
```
frontend/
├── src/
│   ├── components/           # UI components with modular structure
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
└── index.html                # HTML entry point
```

## WebSocket API

The live interaction features are powered by a WebSocket API that supports the following parameters:

- `modalities` - Input/output modalities: `AUDIO`, `VIDEO`, or `TEXT`
- `voice` - Voice name (e.g., `Puck`, `Charon`, `Kore`)
- `model` - Model ID (e.g., `gemini-2.0-flash-live-001`)
- `system` - Custom system instructions
- `mediaResolution` - Video resolution (e.g., `MEDIA_RESOLUTION_MEDIUM`)
- `transcription` - Enable/disable transcription
- `slidingwindow` - Enable/disable sliding window for context
- `nativeAudio` - Use native audio generation for improved quality

Example connection URL:
```
ws://localhost:9000/live?modalities=AUDIO&voice=Puck&model=gemini-2.0-flash-live-001&nativeAudio=true
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- Google API credentials with access to:
  - Gemini API
  - Gmail API
  - Calendar API
  - Maps API (optional)

### Backend Setup
1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   PORT=9000
   GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   OPENWEATHERMAP_API_KEY=your_openweathermap_api_key
   FRONTEND_URL=http://localhost:5173
   ```

4. Place your Google OAuth credentials in `credentials.json` file (obtain from Google Cloud Console)

5. Start the backend server:
   ```
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open the application in your browser at `http://localhost:5173`

## Technologies Used

### Backend
- Express.js - Web server framework
- WebSocket - Real-time communication
- Google API libraries - Gemini, Gmail, Calendar integration
- Multer - File upload handling
- jsonwebtoken - Authentication
- Cookie-parser - Cookie handling
- WS - WebSocket implementation

### Frontend
- React - UI library
- Tailwind CSS - Styling
- React Markdown - Content rendering
- Lucide React - Icon library
- Vite - Build tool
- Google Maps integration

## Development Guidelines

The project follows these development principles:

1. **Component Modularity** - Components follow a structured pattern:
   ```
   ComponentName/
   ├── index.jsx       # Main component export
   ├── constants.js    # Component-specific constants
   ├── README.md       # Component documentation
   └── components/     # Sub-components
   ```

2. **Custom Hooks for State Management** - Complex state and logic are extracted into reusable hooks

3. **Comprehensive Documentation** - Each component and hook has its own README.md

4. **Constants Extraction** - Magic values are moved to dedicated constants files

5. **Responsive Design** - All components work across different screen sizes

## Key Features In-Depth

### Live Sessions
The live session feature allows real-time interaction with Gemini using audio, video, or screen sharing. It provides:
- Voice transcription for natural conversation
- Real-time AI responses through audio synthesis
- Video input processing for visual context
- Screen sharing for collaborative scenarios
- Native audio generation for higher quality voice responses
- Sliding window context management for longer conversations

### Tool Integration
Apsara 2.5 extends Gemini's capabilities with custom tools:
- Send emails through Gmail integration
- Schedule and view calendar events
- Get current weather information
- Create and access notes
- Switch between application tabs
- Generate and edit images
- Capture screenshots during sessions

### Google Authentication
The application uses Google OAuth to:
- Provide personalized experiences
- Access user's Gmail and Calendar data
- Maintain secure sessions
- Display user profile information
- Enable Google Workspace integration

## Future Enhancements
- Improve voice transcription accuracy
- Add more specialized tools
- Enhance file processing capabilities
- Implement collaborative features
- Expand language support
- Develop mobile applications

## Keywords and Tags
apsara2.5, AI Assistant, Gemini API, Google Workspace Integration, React, Node.js, Express, WebSocket, Multimodal AI, Voice Chat, Video Chat, Image Generation, Gmail Integration, Calendar Integration, Meeting Integration, OAuth Authentication

## License
ISC License

## Author

**Shubharthak Sangharsha**
- [GitHub](https://github.com/shubharthaksangharsha/)
- [LinkedIn](https://www.linkedin.com/in/shubharthaksangharsha/)
- [Website/Portfolio](https://devshubh.me/)

© 2025 Apsara 2.5 - Advanced AI Assistant