# ImageModal Component

A modal component for displaying, downloading, and sharing images in the Apsara 2.5 application.

## Features

- Displays images from either base64 data or remote URLs
- Supports downloading images
- Integrates with the Web Share API for sharing images when available
- Responsive design with full-screen overlay
- Dark mode support

## Structure

The component is structured as follows:

```
ImageModal/
├── components/         # Subcomponents
│   ├── ImageDisplay.jsx    # Handles displaying the image
│   └── ModalControls.jsx   # Button controls for download, share, close
├── constants.js        # Shared constants
├── index.jsx           # Main component
└── README.md           # Documentation
```

## Usage

```jsx
import ImageModal from '../components/ImageModal';

// In your component
const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedImage, setSelectedImage] = useState(null);

const handleImageClick = (imageData) => {
  setSelectedImage(imageData);
  setIsModalOpen(true);
};

const closeModal = () => {
  setIsModalOpen(false);
  setSelectedImage(null);
};

// In your JSX
<ImageModal 
  isOpen={isModalOpen} 
  onClose={closeModal} 
  imageData={selectedImage} 
/>
```

## Props

- `isOpen` (boolean): Controls whether the modal is displayed
- `onClose` (function): Function to call when the modal should close
- `imageData` (object): Data for the image to display
  - Can include `data` (base64 string) and `mimeType` (string)
  - Or can include `uri` (string) for remote images

## Image Data Format

The component accepts two types of image data:

1. Base64 encoded data:
```js
{
  data: "base64EncodedString",
  mimeType: "image/jpeg" // or other mime type
}
```

2. URI to remote image:
```js
{
  uri: "https://example.com/image.jpg",
  mimeType: "image/jpeg" // optional for URIs
}
```

Special handling is provided for Google API URIs that include `generativelanguage.googleapis.com`. 