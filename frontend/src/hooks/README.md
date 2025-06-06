# Hooks Architecture

This directory contains all custom React hooks used in Apsara 2.5. Each hook is organized into its own directory with a consistent structure.

## Shared Resources

- `common-constants.js`: Shared constants used across multiple hooks (e.g., `BACKEND_URL`, `MAX_STORAGE_BYTES`)

## Hook Directory Structure

Each hook follows this standard structure:

```
hooks/
├── useHookName/
│   ├── index.js         # Main hook implementation
│   ├── constants.js     # Hook-specific constants
│   ├── [utility].js     # Various utility files specific to the hook
│   └── README.md        # Documentation and usage examples
```

## Available Hooks

### 1. `useChatApi`

Manages all interaction with the chat API, handling both regular and streaming communication.

- **Key features**: Regular chat, streaming chat, message handling, file attachments
- **Related files**: `chat-api.js`, `stream-api.js`, `config-utils.js`

### 2. `useAppSettings`

Manages application settings and preferences with persistent storage.

- **Key features**: Model selection, temperature, max tokens, system instructions, tool settings
- **Related files**: `settings-persistence.js`, `capabilities-utils.js`

### 3. `useConversations` 

Manages chat conversations, their storage, and operations like creating, deleting, and updating conversations.

- **Key features**: Conversation CRUD operations, localStorage management, storage pruning
- **Related files**: `conversation-management.js`, `storage-utils.js`

### 4. `useFileUpload`

Handles file uploads for use with the chat API.

- **Key features**: File uploading, file removal, state management of uploads
- **Related files**: `file-api.js`

### 5. `useTheme`

Manages dark/light theme preferences with localStorage persistence.

- **Key features**: Theme toggling, system preference detection, DOM updates
- **Related files**: `theme-utils.js`

### 6. `useGoogleAuth`

Handles Google Authentication flow and user profile management.

- **Key features**: Sign-in, sign-out, profile management, authentication state
- **Related files**: `auth-api.js`, `storage-utils.js`

### 7. `useLiveSession`

Manages the live session features including audio, video, and screen sharing.

- **Key features**: WebSocket communication, audio/video streaming, session management
- **Related files**: Complex directory structure with multiple modules

## Usage Example

```jsx
import { useTheme } from './hooks/useTheme';
import { useChatApi } from './hooks/useChatApi';

function MyComponent() {
  const [darkMode, setDarkMode] = useTheme();
  const { sendToBackend, isLoading } = useChatApi({...});
  
  return (
    <div className={darkMode ? 'dark' : 'light'}>
      {/* Component content */}
    </div>
  );
}
```

## Design Principles

1. **Single Responsibility**: Each hook has a clear, focused purpose
2. **Modularity**: Implementation details are split into separate files
3. **Shared Resources**: Common constants are centralized to avoid duplication
4. **Consistent Structure**: All hooks follow the same organizational pattern
5. **Documentation**: Each hook includes detailed documentation with usage examples 