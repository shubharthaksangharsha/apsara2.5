# Apsara 2.5 Backend

Backend server for Apsara 2.5, an advanced AI assistant powered by Google's Gemini API. This server provides REST API endpoints, WebSocket-based live connections, and a comprehensive suite of AI tools and integrations.

## 🔄 Version Information
- **Current Version**: 2.5.2
- **Architecture**: Modular, domain-driven design
- **Key Improvements**:
  - Refactored from monolithic to modular architecture
  - Improved maintainability with clear separation of concerns
  - Enhanced developer experience
  - Better testability of individual components
  - Fixed WebSocket connection handling
  - Improved notes functionality

## 📁 Directory Structure

```
backend/
├── config/              # Application configuration
│   ├── env.js           # Environment variables
│   ├── auth.js          # Auth configuration
│   └── ai.js            # AI models configuration
├── middleware/          # Express middleware
│   ├── auth.js          # Authentication middleware
│   └── cors.js          # CORS configuration
├── routes/              # API routes
│   ├── auth.js          # Authentication routes
│   ├── api.js           # Basic API endpoints
│   ├── chat.js          # Chat endpoints
│   ├── files.js         # File management
│   ├── system.js        # System configuration
│   └── tools.js         # AI tools routes
├── services/            # Business logic
│   ├── ai/              # AI services
│   │   ├── client.js    # AI client initialization
│   │   └── image/       # Image generation
│   ├── google/          # Google API integrations
│   │   ├── auth/        # Authentication helpers
│   │   ├── calendar/    # Calendar API tools
│   │   ├── gmail/       # Gmail API tools
│   │   └── maps/        # Maps API tools
│   └── tools/           # AI tool implementations
│       ├── core/        # Core utility tools
│       ├── ui/          # UI interaction tools
│       ├── weather/     # Weather service
│       └── notes/       # Notes management
├── utils/               # Helper utilities
├── websocket/           # WebSocket handlers
│   ├── index.js         # Main export point
│   ├── server.js        # WebSocket server setup
│   ├── handlers/        # Message and connection handlers
│   ├── config/          # WebSocket configuration 
│   └── utils/           # WebSocket utilities
├── uploads/             # Uploaded files directory
├── public/              # Static files
├── get_battery.py       # Python helper script for battery status
├── index.js             # Application entry point
└── package.json         # Dependencies
```

## 🚀 Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/shubharthaksangharsha/apsara2.5.git
   cd apsara2.5/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file** in the backend directory with the following variables:
   ```
   PORT=9000
   GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   OPENWEATHERMAP_API_KEY=your_openweathermap_api_key
   FRONTEND_URL=http://localhost:5173
   ```

4. **Google API Setup:**
   - Create a project in [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the necessary APIs:
     - Gemini API
     - Gmail API
     - Calendar API
     - Maps API
   - Create OAuth credentials (Web Application type)
   - Download credentials as `credentials.json` and place in the backend directory
   - Configure the OAuth consent screen with appropriate scopes

5. **Start the server:**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## 🔌 API Endpoints

### System Endpoints
- `GET /health` - Server health check
- `GET /models` - List available chat models
- `GET /models/live` - List available live models
- `GET /voices` - List available voices
- `POST /voices/select` - Select a voice
- `GET /system` - Get system instructions
- `POST /system` - Update system instructions

### Authentication Endpoints
- `GET /api/auth/status` - Check authentication status
- `GET /api/auth/google/url` - Get Google OAuth URL
- `POST /api/auth/google/callback` - Handle Google OAuth callback (programmatic)
- `GET /api/auth/google/callback` - Handle Google OAuth redirect (browser-based)
- `POST /api/auth/logout` - Logout

### Chat Endpoints
- `POST /chat` - Send a chat message
- `POST /chat/stream` - Stream a chat response
- `POST /chat/function-result` - Send function result to AI

### File Management
- `POST /files` - Upload a file
- `GET /files` - List uploaded files
- `GET /files/content` - Get file content
- `DELETE /files/:fileId` - Delete a file

### Tools
- `GET /tools` - List available tools
- `POST /tools/invoke` - Invoke a tool

## 🔄 WebSocket API

Connect to `ws://localhost:9000/live` with the following query parameters:

- `modalities` - Input/output modalities: `AUDIO`, `VIDEO`, or `TEXT` (default: `TEXT`)
- `voice` - Voice name (e.g., `Puck`, `Charon`, `Kore`)
- `model` - Model ID (e.g., `gemini-2.0-flash-live-001`)
- `system` - Custom system instructions (URL-encoded)
- `mediaResolution` - Video resolution (default: `MEDIA_RESOLUTION_MEDIUM`)
- `transcription` - Enable/disable transcription (default: `true`)
- `slidingwindow` - Enable/disable sliding window for context (default: `true`)
- `slidingwindowtokens` - Maximum context tokens (default: `4000`)
- `nativeAudio` - Use native audio generation (default: `false`) 
- `disablevad` - Disable voice activity detection (default: `false`)

Example connection URL:
```
ws://localhost:9000/live?modalities=AUDIO&voice=Puck&model=gemini-2.0-flash-live-001&nativeAudio=true
```

## 🛠️ Available Tools

### Google Integrations
- **Gmail**
  - `sendGmail` - Send emails
  - `draftGmail` - Create email drafts
  - `listGmailMessages` - List emails
  - `getGmailMessage` - Get email content
- **Calendar**
  - `createCalendarEvent` - Create calendar events
  - `listCalendarEvents` - List calendar events
- **Maps**
  - `getGoogleMapsRoute` - Get directions and travel info

### Core Tools
- `getCurrentTime` - Get current server time
- `echo` - Echo test message
- `getBatteryStatus` - Get system battery status

### UI Tools
- `generateImage` - Generate images with AI
- `editImage` - Edit generated images
- `captureScreenshot` - Capture screenshots
- `switchTab` - Switch UI tabs

### Information Tools
- `getWeather` - Get current weather for a location

### Productivity
- `takeNotes` - Save user notes
- `loadNotes` - Retrieve saved notes

## 📝 Authentication Setup

To use Google services (Gmail, Calendar), you need to set up authentication:

1. Configure OAuth consent screen in Google Cloud Console
2. Add the required scopes:
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.compose`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
3. Add `http://localhost:9000/api/auth/google/callback` to authorized redirect URIs

## 🐳 Docker Support

```bash
# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run

# Run with Docker Compose
npm run docker:compose

# Stop Docker Compose
npm run docker:down
```

## 📦 Dependencies

- `@google/genai` - Google Generative AI API
- `express` - Web server framework
- `googleapis` - Google APIs client library
- `multer` - File upload handling
- `cors` - Cross-Origin Resource Sharing
- `cookie-parser` - Cookie parsing middleware
- `ws` - WebSocket implementation

## 🔗 Related Projects

- [Apsara Frontend](https://github.com/shubharthaksangharsha/apsara2.5/tree/main/frontend) - The frontend UI for this project

## 📝 Versioning Guidelines

When updating this project, follow [Semantic Versioning](https://semver.org/) principles:

1. **MAJOR version** (X.0.0): For incompatible API changes
2. **MINOR version** (0.X.0): For functionality added in a backward-compatible manner
3. **PATCH version** (0.0.X): For backward-compatible bug fixes

To update the version:
1. Modify the `version` field in `package.json`
2. Update the version number in this README
3. Document changes in a CHANGELOG.md file (optional)

## 📄 License

ISC