# Files Components

This directory contains components related to file handling, display, and uploading in the Apsara 2.5 application.

## Components

### FilePreviewBar

A component that displays a preview bar of uploaded files, typically shown below the chat input area.

**Props**:
- `files`: Array of file objects to display
- `onRemoveFile`: Function to call when a file is requested to be removed

### FilePreviewItem

An individual file preview item, displaying file type icon, name, and size with a remove button.

**Props**:
- `file`: File object containing data like originalname, mimetype, size, etc.
- `onRemove`: Function to call when the remove button is clicked

### FileUploadPopup

A modal popup for uploading files with drag-and-drop functionality.

**Props**:
- `onClose`: Function to call when the popup should close
- `onUpload`: Function to handle file upload processing
- `files`: Array of already uploaded files to display

## Usage

```jsx
import { FilePreviewBar, FileUploadPopup } from '../components/Files';

// Inside your component
const [files, setFiles] = useState([]);
const [showUploadPopup, setShowUploadPopup] = useState(false);

const handleRemoveFile = (fileId) => {
  setFiles(files.filter(file => 
    (file.googleFileName || file.id || file.originalname) !== fileId
  ));
};

const handleUpload = async (file) => {
  // Upload logic here
  const newFile = { originalname: file.name, mimetype: file.type, size: file.size, id: Date.now() };
  setFiles([...files, newFile]);
};

return (
  <div>
    <FilePreviewBar 
      files={files} 
      onRemoveFile={handleRemoveFile} 
    />
    
    <button onClick={() => setShowUploadPopup(true)}>
      Upload Files
    </button>
    
    {showUploadPopup && (
      <FileUploadPopup
        onClose={() => setShowUploadPopup(false)}
        onUpload={handleUpload}
        files={files}
      />
    )}
  </div>
);
``` 