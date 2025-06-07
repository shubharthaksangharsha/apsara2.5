# ScreenShareDisplay Component

A component for displaying a local screen share stream in the Apsara 2.5 application.

## Features

- Displays screen capture MediaStream
- Shows a "Your Screen Share" label overlay
- Handles streaming lifecycle (attach/detach)
- Mutes local audio to prevent feedback
- Automatically hides when screen sharing is inactive
- Clean visual styling with border indicators

## Structure

The component is structured as follows:

```
ScreenShareDisplay/
├── constants.js       # CSS classes and text constants
├── index.jsx          # Main component
└── README.md          # Documentation
```

## Usage

```jsx
import ScreenShareDisplay from '../components/ScreenShareDisplay';

// In your component
const [screenStream, setScreenStream] = useState(null);
const [isScreenSharingActive, setIsScreenSharingActive] = useState(false);

// Start screen sharing example
const startScreenSharing = async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ 
      video: true,
      audio: false // For screen sharing typically
    });
    
    setScreenStream(stream);
    setIsScreenSharingActive(true);
    
    // Handle stream ending
    stream.getVideoTracks()[0].onended = () => {
      setIsScreenSharingActive(false);
    };
  } catch (err) {
    console.error('Error starting screen share:', err);
    setIsScreenSharingActive(false);
  }
};

// In your JSX
<ScreenShareDisplay 
  screenStream={screenStream}
  isScreenSharingActive={isScreenSharingActive}
/>
```

## Props

- `screenStream` (MediaStream): The MediaStream object from screen capture
- `isScreenSharingActive` (boolean): Whether screen sharing is currently active

## Technical Details

The component uses React's `useRef` and `useEffect` hooks to manage the video element's lifecycle, correctly attaching and detaching the MediaStream as needed. When screen sharing becomes inactive, the component automatically detaches the stream and returns `null` to unmount itself from the DOM.

It's important to note that the component expects you to handle the acquisition and management of the screen sharing permissions and MediaStream object in the parent component. 