# ImagePreview Components

A set of components for displaying image file previews in the Apsara 2.5 application.

## Features

- Displays preview thumbnails for image files
- Shows upload status indicators (uploading, success, error)
- Provides remove functionality for each image
- Organizes images in a horizontal scrollable bar
- Supports both File objects and image data objects

## Structure

The component is structured as follows:

```
ImagePreview/
├── components/              # Subcomponents
│   ├── ImagePreviewItem.jsx # Individual image preview thumbnail
│   └── ImagePreviewBar.jsx  # Container for multiple previews
├── constants.js             # Shared constants
├── index.jsx                # Exports
└── README.md                # Documentation
```

## Usage

```jsx
import { ImagePreviewBar, PREVIEW_STATUS } from '../components/ImagePreview';

// In your component
const [imageFiles, setImageFiles] = useState([]);
const [uploadStatus, setUploadStatus] = useState({});

const handleRemoveFile = (file) => {
  setImageFiles(prev => prev.filter(f => f !== file));
  
  // If there's an upload status for this file, remove it
  if (uploadStatus[file.name]) {
    const newStatus = { ...uploadStatus };
    delete newStatus[file.name];
    setUploadStatus(newStatus);
  }
};

// In your JSX
<ImagePreviewBar 
  files={imageFiles} 
  onRemoveFile={handleRemoveFile} 
  uploadStatus={uploadStatus} 
/>
```

## Components

### ImagePreviewBar

A horizontal scrollable bar that displays multiple image previews.

#### Props

- `files` (array, required): Array of file objects to display
- `onRemoveFile` (function, required): Function to call when a file is removed
- `uploadStatus` (object, optional): Object mapping file names to upload status

### ImagePreviewItem

An individual image preview thumbnail with status indicator.

#### Props

- `file` (object, required): File object to preview
- `onRemove` (function, required): Function to call when remove button is clicked
- `status` (string, optional): Current upload status (defaults to 'pending')

## Constants

The `PREVIEW_STATUS` object provides standardized status values:

- `PENDING`: Default state before upload
- `UPLOADING`: File is currently being uploaded
- `SUCCESS`: File uploaded successfully
- `ERROR`: Upload failed 