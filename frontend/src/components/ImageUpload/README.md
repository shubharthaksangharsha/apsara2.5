# ImageUpload Component

A button component for uploading images in the Apsara 2.5 application.

## Features

- File selection dialog for choosing image files
- Clipboard paste support for images
- Multiple file selection support
- Filter for image file types
- Clean, accessible UI

## Structure

The component is structured as follows:

```
ImageUpload/
├── components/              # Subcomponents
│   └── ImageUploadButton.jsx # Main upload button component
├── constants.js             # Shared constants
├── index.jsx                # Exports
└── README.md                # Documentation
```

## Usage

```jsx
import ImageUploadButton from '../components/ImageUpload';

// In your component
const handleFilesSelected = (files) => {
  // Handle the selected files
  console.log('Files selected:', files);
  
  // Example: Add to state
  setImageFiles(prev => [...prev, ...files]);
};

// In your JSX
<ImageUploadButton 
  onFilesSelected={handleFilesSelected}
  multiple={true} // Optional, defaults to true
  accept="image/*" // Optional, defaults to "image/*"
/>
```

## Props

- `onFilesSelected` (function, required): Callback function that receives an array of selected image files
- `multiple` (boolean, optional): Whether multiple files can be selected at once (default: true)
- `accept` (string, optional): MIME types to accept (default: "image/*")

## Clipboard Support

The component automatically listens for paste events on the document, allowing users to paste images from their clipboard. This works well for screenshots and images copied from other applications.

## Constants

The component exports several constants that can be imported and used:

- `DEFAULT_ACCEPT`: Default MIME type filter ("image/*")
- `PASTE_EVENT_TYPE`: Event type for clipboard paste ("paste")
- `UPLOAD_BUTTON_ARIA_LABEL`: Default accessibility label for the upload button 