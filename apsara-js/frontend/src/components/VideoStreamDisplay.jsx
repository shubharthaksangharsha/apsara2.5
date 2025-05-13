import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react'; // Import the rotate icon

/**
 * Displays the local video stream captured from the user's webcam.
 *
 * Props:
 *  - videoStream: The MediaStream object from the webcam.
 *  - isWebcamActive: Boolean indicating if the webcam should be actively displayed.
 *  - onSwitchCamera: Function to switch the camera.
 */
function VideoStreamDisplay({ videoStream, isWebcamActive, onSwitchCamera }) {
  const videoRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isWebcamActive && videoStream && videoRef.current) {
       console.log("[VideoStreamDisplay] Attaching stream to video element.");
      // Attach the stream to the video element
      if (videoRef.current.srcObject !== videoStream) {
         videoRef.current.srcObject = videoStream;
         videoRef.current.muted = true; // Important: Mute local playback to avoid echo
         videoRef.current.play().catch(err => {
           console.error("Error playing local video stream:", err);
           // Handle potential autoplay restrictions or other errors
         });
      }
    } else if (!isWebcamActive && videoRef.current && videoRef.current.srcObject) {
       console.log("[VideoStreamDisplay] Detaching stream and pausing video.");
      // Detach stream and pause video when webcam is deactivated
       // No need to stop tracks here, that's handled by the hook that provides the stream
       videoRef.current.pause();
       videoRef.current.srcObject = null;
    }
    // Cleanup function isn't strictly necessary here if the stream lifecycle
    // is managed entirely by the parent hook/component. The useEffect dependency
    // array handles re-attachment if the stream object changes.

  }, [videoStream, isWebcamActive]); // Re-run effect if stream or active state changes

  const handleSwitchCamera = () => {
    if (typeof onSwitchCamera === 'function') {
      onSwitchCamera();
    }
  };

  // Only render the video element if the webcam is intended to be active
  if (!isWebcamActive) {
    return null; // Don't render anything if webcam is off
  }

  return (
    <div className="video-stream-container w-full h-full bg-black rounded-lg overflow-hidden relative shadow-md border border-indigo-500/50">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
      />
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-between items-center">
        <span className="text-xs text-white bg-black/70 px-2 py-0.5 rounded-md shadow">Your Camera</span>
        
        {/* Camera flip button - Only for mobile devices */}
        {isMobile && (
          <button 
            onClick={handleSwitchCamera}
            className="p-1.5 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors"
            aria-label="Switch Camera"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default VideoStreamDisplay; 