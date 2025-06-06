# useChatApi Hook

This hook manages all interactions with the chat API, handling both regular and streaming chat endpoints.

## Directory Structure

```
useChatApi/
├── index.js          # Main hook entrypoint
├── chat-api.js       # Regular (non-streaming) chat API methods
├── stream-api.js     # Streaming chat API methods
├── config-utils.js   # Configuration utilities 
├── constants.js      # Shared constants
└── README.md         # Documentation
```

## Usage

```jsx
import { useChatApi } from '../hooks/useChatApi';

function MyComponent() {
  // Hook configuration
  const {
    isLoading,
    streamingModelMessageId,
    sendToBackend,
    startStreamChat,
    applyConfigSettings
  } = useChatApi({
    convos,
    setConvos,
    activeConvoId,
    setActiveConvoId,
    currentModel,
    temperature,
    maxOutputTokens,
    enableGoogleSearch,
    enableCodeExecution,
    systemInstruction,
    isSystemInstructionApplicable,
    uploadedFiles,
    clearUploadedFiles,
    enableThinking,
    thinkingBudget,
  });

  // Regular chat
  const handleSend = async () => {
    await sendToBackend(message);
  };

  // Streaming chat
  const handleStreamingChat = async () => {
    await startStreamChat(message);
  };

  return (
    <div>
      {/* Component content */}
    </div>
  );
}
```

## API Reference

### Hook Return Values

- `isLoading` - Boolean indicating if a request is in progress
- `streamingModelMessageId` - ID of the current streaming model message, or null if not streaming
- `sendToBackend` - Function to send a message using the regular chat endpoint
- `startStreamChat` - Function to send a message using the streaming chat endpoint
- `applyConfigSettings` - Utility function to apply configuration settings

### Main Methods

#### `sendToBackend(text, targetConvoId?, initialConvoData?, targetModelId?)`

Sends a message using the regular (non-streaming) chat endpoint.

#### `startStreamChat(text, targetConvoId?, initialConvoData?, targetModelId?, overrideEnableSearch?, overrideEnableCodeExec?, explicitFiles?)`

Sends a message using the streaming chat endpoint. 