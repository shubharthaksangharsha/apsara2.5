# SavedSessionsPanel Component

A component for saving, loading, and managing conversation sessions in the Apsara 2.5 application.

## Features

- Save current conversation to localStorage
- Load previously saved conversations
- Auto-generate titles from first user message
- Delete individual sessions
- Clear all saved sessions
- Responsive UI with empty state
- Limit maximum number of saved sessions

## Structure

The component is structured as follows:

```
SavedSessionsPanel/
├── components/             # Subcomponents
│   ├── SessionItem.jsx     # Individual session item
│   └── EmptyState.jsx      # Empty state display
├── constants.js            # Configuration constants
├── index.jsx               # Main component
└── README.md               # Documentation
```

## Usage

```jsx
import SavedSessionsPanel from '../components/SavedSessionsPanel';

// In your component
const [messages, setMessages] = useState([]);

const handleLoadSession = (savedMessages) => {
  // Replace current messages with saved ones
  setMessages(savedMessages);
};

// In your JSX
<SavedSessionsPanel 
  currentMessages={messages}
  onLoadSession={handleLoadSession}
/>
```

## Props

- `currentMessages` (array): The current conversation messages
- `onLoadSession` (function): Handler called when a saved session is loaded

## Session Data Format

Each saved session has the following structure:

```js
{
  id: "1623847562000", // Timestamp as string
  title: "How do I solve this math problem?", // Auto-generated from first user message
  messages: [ /* array of message objects */ ],
  timestamp: 1623847562000 // Creation timestamp
}
```

## Message Data Format

Each message in the messages array should have at least:

```js
{
  role: "user" | "assistant" | "system", // The role of the message sender
  content: "Message text content" // The message content
}
```

## Configuration

The component's behavior can be configured by modifying constants in `constants.js`:

- `STORAGE_KEY`: The key used for localStorage (default: 'apsara_saved_sessions')
- `MAX_SESSIONS`: Maximum number of sessions to save (default: 50)
- `MAX_TITLE_LENGTH`: Maximum length of auto-generated titles (default: 50)

## Technical Details

The component uses React's `useState` and `useEffect` hooks to manage state and side effects. It stores sessions in the browser's localStorage, so they persist across page reloads and browser sessions.

The component automatically generates a title for each saved session based on the first user message, truncating it if necessary. If no suitable title can be generated, it falls back to a default title ("Conversation").

When loading a saved session, the component calls the `onLoadSession` callback with the saved messages, allowing the parent component to update its state. 