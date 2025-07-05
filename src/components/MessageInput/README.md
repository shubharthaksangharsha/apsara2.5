# MessageInput Component

The MessageInput component provides a rich text input interface for the Apsara 2.5 application, allowing users to send messages, attach files, upload images, and toggle between streaming and non-streaming modes.

## Features

- Multi-line text input with auto-expanding height
- Streaming toggle to switch between streaming and standard message sending
- File upload button for general file attachments
- Image upload button specifically for images to be included with the message
- Drag-and-drop support for image uploads
- Preview bar for uploaded images with status indicators
- Responsive design for different screen sizes
- Disabled states for various loading/processing conditions
- Enter key support for sending messages (Shift+Enter for new line)

## Props

| Prop Name | Type | Description |
|-----------|------|-------------|
| `onSend` | Function | Handler for sending messages in non-streaming mode |
| `onStreamSend` | Function | Handler for sending messages in streaming mode |
| `isLoading` | Boolean | Whether a message is currently being processed |
| `disabled` | Boolean | Whether the input should be disabled (e.g., no active conversation) |
| `onFileUploadClick` | Function | Handler for general file upload button click |
| `streamEnabled` | Boolean | Whether streaming mode is currently enabled |
| `onStreamToggleChange` | Function | Handler for toggling streaming mode on/off |
| `selectedImagesForPrompt` | Array | List of images currently selected for the message |
| `onSelectImagesForPrompt` | Function | Handler for selecting images (via button or drag-drop) |
| `onRemoveSelectedImage` | Function | Handler for removing a selected image |
| `promptImageUploadStatus` | Object | Status of image uploads, keyed by filename with values: 'success', 'error', 'uploading', 'pending' |

## Usage

```jsx
import MessageInput from '../components/MessageInput';

// In your component:
<MessageInput
  onSend={sendMessage}
  onStreamSend={streamMessage}
  isLoading={isMessageLoading}
  disabled={!activeConversation}
  onFileUploadClick={() => setFileUploadOpen(true)}
  streamEnabled={streamingMode}
  onStreamToggleChange={setStreamingMode}
  selectedImagesForPrompt={selectedImages}
  onSelectImagesForPrompt={handleSelectImages}
  onRemoveSelectedImage={handleRemoveImage}
  promptImageUploadStatus={imageUploadStatus}
/>
```

## File Structure

- `index.jsx` - Main component implementation
- `constants.js` - Constants used by the component (class names, measurements, etc.)

## Dependencies

- React
- @headlessui/react (for Switch component)
- lucide-react (for icons)
- ImageUploadButton component
- ImagePreviewBar component 