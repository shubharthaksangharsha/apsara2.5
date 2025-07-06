# ChatWindow Component

The ChatWindow component is responsible for rendering the conversation between a user and the AI assistant in the Apsara 2.5 application. It handles various message types, including user messages, AI responses, system messages, error messages, code blocks, code execution results, and image attachments.

## Features

- Displays user messages with image attachments
- Displays AI responses with rich formatting via Markdown
- Renders collapsible code blocks with syntax highlighting and copy functionality
- Shows collapsible code execution results
- Displays collapsible "thought" sections for AI reasoning
- Provides copy functionality for all message types
- Supports image previews with modal expansion
- Handles streaming text animation
- Auto-scrolls to the latest message

## Component Structure

The ChatWindow component has been refactored into multiple subcomponents for better maintainability:

- `index.jsx` - Main component that orchestrates the message display
- `components/UserMessage.jsx` - Renders user messages with image attachments
- `components/ModelMessage.jsx` - Renders AI responses with various content types
- `components/CodeBlock.jsx` - Displays collapsible code blocks with syntax highlighting
- `components/CodeExecutionResult.jsx` - Shows collapsible code execution results
- `components/ThoughtSummary.jsx` - Renders collapsible AI reasoning sections
- `constants.js` - Shared constants for styling and configuration

## Props

| Prop Name | Type | Description |
|-----------|------|-------------|
| `convo` | Object | The conversation data containing messages to display |
| `streamingModelMessageId` | String | ID of the message currently being streamed |
| `isLoading` | Boolean | Whether a message is currently being processed |

## Usage

```jsx
import ChatWindow from '../components/ChatWindow';

// In your component:
<ChatWindow 
  convo={activeConversation}
  streamingModelMessageId={streamingId}
  isLoading={isProcessing} 
/>
```

## Dependencies

- React
- ReactMarkdown
- remark-gfm
- lucide-react (for icons)
- ImageModal component 