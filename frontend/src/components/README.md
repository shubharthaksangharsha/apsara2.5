# Components Directory

This directory contains the UI components for Apsara 2.5. Each component is organized in its own directory with a consistent structure.

## Directory Structure

Each component follows this structure:

```
ComponentName/
  ├── index.jsx          - Main component export
  ├── components/        - Sub-components (if applicable)
  │   └── ...
  ├── constants.js       - Component-specific constants
  ├── utils.js           - Component-specific utilities
  └── README.md          - Documentation
```

## Major Components

- `ChatWindow` - Main chat interface component
- `EmptyChatContent` - Empty state UI for new chats
- `Header` - Application header with model selector and controls
- `LivePopup` - Modal for live chat sessions
- `MessageInput` - Text input for user messages
- `SettingsPanel` - Settings modal for configuring chat parameters
- `Sidebar` - Navigation sidebar with conversation management
- `WelcomeScreen` - Initial screen with prompts and authentication

## Common Utilities

Shared utilities and constants are located in the `common/` directory:

- `common/constants.js` - Shared constants used across components
- `common/utils.js` - Utility functions for common UI tasks

## Best Practices

1. **Component Organization**: Keep related files together in the component directory
2. **Single Responsibility**: Each component should have a single responsibility
3. **Prop Documentation**: Document props with JSDoc comments
4. **Consistent Export Pattern**: Use named exports for utilities and default exports for the main component 