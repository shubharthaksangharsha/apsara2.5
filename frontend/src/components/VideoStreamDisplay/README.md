# VideoStreamDisplay Component

A component for displaying a local camera video stream in the Apsara 2.5 application.

## Features

- Displays camera feed from a MediaStream
- Manages video element lifecycle (attach/detach)
- Shows a "Your Camera" label overlay
- Optional camera flip button for mobile devices
- Clean UI with border indicators
- Conditional rendering based on camera enabled state
- Proper resource cleanup to prevent memory leaks

## Structure

The component is structured as follows:

```
VideoStreamDisplay/
├── components/              # Subcomponents
│   └── CameraFlipButton.jsx # Button to switch between cameras
├── constants.js             # CSS classes and text constants
├── index.jsx                # Main component
└── README.md                # Documentation
```

## Usage

```jsx
import VideoStreamDisplay from '../components/VideoStreamDisplay';

// In your component
const [videoStream, setVideoStream] = useState(null);
const [cameraEnabled, setCameraEnabled] = useState(false);
const [hasFrontAndBackCamera, setHasFrontAndBackCamera] = useState(false);

// Start camera example
const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true,
      audio: false
    });
    
    setVideoStream(stream);
    setCameraEnabled(true);
    
    // Check if device has multiple cameras
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    setHasFrontAndBackCamera(videoDevices.length > 1);
  } catch (err) {
    console.error('Error accessing camera:', err);
    setCameraEnabled(false);
  }
};

// Flip camera handler
const handleFlipCamera = async () => {
  if (!videoStream) return;
  
  // Stop all current tracks
  videoStream.getTracks().forEach(track => track.stop());
  
  try {
    // Toggle between front and back cameras
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode === 'user' ? 'environment' : 'user' },
      audio: false
    });
    
    setVideoStream(newStream);
    setCurrentFacingMode(currentFacingMode === 'user' ? 'environment' : 'user');
  } catch (err) {
    console.error('Error flipping camera:', err);
  }
};

// In your JSX
<VideoStreamDisplay 
  videoStream={videoStream}
  cameraEnabled={cameraEnabled}
  onFlipCamera={handleFlipCamera}
  isFlipAvailable={hasFrontAndBackCamera}
/>
```

## Props

- `videoStream` (MediaStream): The MediaStream object from camera
- `cameraEnabled` (boolean): Whether the camera is currently enabled
- `onFlipCamera` (function): Handler for when the flip camera button is clicked
- `isFlipAvailable` (boolean, optional): Whether a flip camera option is available (default: false)

## Technical Details

The component uses React's `useRef` and `useEffect` hooks to manage the video element's lifecycle, correctly attaching and detaching the MediaStream as needed. When the camera is disabled, the component automatically cleans up resources and returns `null` to unmount itself from the DOM.

The component handles resource cleanup in three scenarios:
1. When the camera is explicitly disabled via props
2. When the video stream becomes unavailable
3. When the component unmounts

This ensures that all MediaStream resources are properly released when no longer needed. 