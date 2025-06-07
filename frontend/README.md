# Apsara 2.5 - Frontend

## Project Overview

The Apsara 2.5 frontend is a React-based application that provides an interactive chat interface with AI capabilities. Key features include:

- Multi-model chat interface
- File upload and preview functionality
- Theme customization (light/dark mode)
- Google authentication integration
- Live session capabilities
- Advanced AI settings (temperature, token limits, etc.)

## Directory Structure

### `/src/components`
Contains all React components organized by feature:

- **Files/**: File handling components (recently refactored)
  - `FilePreviewBar.jsx` - Displays uploaded files
  - `FilePreviewItem.jsx` - Individual file preview
  - `FileUploadPopup.jsx` - File upload modal
  - `constants.js` - Shared styling constants
  - `README.md` - Component documentation

- **ChatWindow/**: Main chat interface components
- **MessageInput/**: Message composition components
- **WelcomeScreen/**: Initial welcome experience
- **Sidebar/**: Navigation sidebar
- **Header/**: Top navigation bar
- **SettingsPanel/**: User settings interface

### `/src/hooks`
Custom React hooks for application logic:

- `useTheme.js` - Theme management (light/dark mode)
- `useAppSettings.js` - AI model settings
- `useConversations.js` - Chat session management
- `useChatApi.js` - API communication
- `useFileUpload.js` - File handling logic
- `useGoogleAuth.js` - Google authentication
- `useLiveSession.js` - Live session management

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Key Refactoring Work

Recent improvements include:

1. **Component Modularization**:
   - Split large components into smaller, focused ones
   - Created dedicated directories with constants and documentation
   - Standardized prop interfaces

2. **File Handling Improvements**:
   - Consolidated file-related components into `/Files` directory
   - Added proper error handling for uploads
   - Improved preview functionality

3. **Code Organization**:
   - Separated concerns between components and hooks
   - Improved documentation with README files
   - Standardized styling approach

## Technical Stack

- React 18
- Vite (build tool)
- Tailwind CSS (styling)
- Lucide React (icons)
- Custom hooks for state management

## Contribution Guidelines

1. Follow the established component structure
2. Add documentation for new components
3. Use existing hooks for shared logic
4. Maintain consistent styling with Tailwind
5. Test changes thoroughly before committing 