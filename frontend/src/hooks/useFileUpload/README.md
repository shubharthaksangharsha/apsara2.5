# useFileUpload Hook

This hook manages file uploads for use with the chat API, handling both upload and removal operations.

## Directory Structure

```
useFileUpload/
├── index.js        # Main hook entrypoint
├── constants.js    # API constants
├── file-api.js     # API call functions
└── README.md       # Documentation
```

## Usage

```jsx
import { useFileUpload } from '../hooks/useFileUpload';

function MyComponent() {
  const {
    files,            // Array of uploaded file metadata
    setFiles,         // Setter for files (if direct manipulation is needed)
    uploadFile,       // Function to upload a file
    removeFile,       // Function to remove a file
  } = useFileUpload();

  const handleFileSelection = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        await uploadFile(file);
        // File upload success
      } catch (error) {
        // Handle upload error
        console.error('Failed to upload file:', error);
      }
    }
  };

  const handleFileRemoval = async (fileId) => {
    try {
      await removeFile(fileId);
      // File removed successfully
    } catch (error) {
      // Handle removal error
      console.error('Failed to remove file:', error);
    }
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

- `files` - Array of uploaded file metadata objects
- `setFiles` - Setter function for direct manipulation of the files array
- `uploadFile(file)` - Uploads a file to the server and adds it to state
- `removeFile(fileId)` - Removes a file from the server and state

### File Object Structure

```js
{
  id: "123456",             // File ID
  googleFileName: "abc123", // Google file name (used for deletion)
  originalname: "image.jpg", // Original file name
  uri: "https://example.com/file.jpg", // File URI
  mimetype: "image/jpeg",   // File MIME type
  size: 12345               // File size in bytes
}
``` 