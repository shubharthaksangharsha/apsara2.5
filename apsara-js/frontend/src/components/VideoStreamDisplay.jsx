import React, { useEffect, useRef } from 'react';

/**
 * Displays the local video stream captured from the user's webcam.
 *
 * Props:
 *  - videoStream: The MediaStream object from the webcam.
 *  - isWebcamActive: Boolean indicating if the webcam should be actively displayed.
 */
function VideoStreamDisplay({ videoStream, isWebcamActive }) {
  const videoRef = useRef(null);

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

  // Only render the video element if the webcam is intended to be active
  if (!isWebcamActive) {
    return null; // Don't render anything if webcam is off
  }

  return (
    <div className="video-stream-container bg-black rounded-md overflow-hidden shadow-lg absolute bottom-20 right-5 w-48 h-36 z-50 border border-gray-700">
       {/* Basic styling - adjust as needed */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover" // Ensure video fills the container
        playsInline // Important for mobile browsers
        // `autoPlay` might be needed but `play()` is called in useEffect
      />
      <p className="absolute bottom-1 left-1 text-xs text-white bg-black bg-opacity-50 px-1 rounded">Your Camera</p>
    </div>
  );
}

export default VideoStreamDisplay; 