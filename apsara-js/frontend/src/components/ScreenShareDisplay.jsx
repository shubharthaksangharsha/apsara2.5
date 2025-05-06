import React, { useEffect, useRef } from 'react';

/**
 * Displays the local screen share stream.
 *
 * Props:
 *  - screenStream: The MediaStream object from screen capture.
 *  - isScreenSharingActive: Boolean indicating if screen sharing is active.
 */
function ScreenShareDisplay({ screenStream, isScreenSharingActive }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (isScreenSharingActive && screenStream && videoRef.current) {
      console.log("[ScreenShareDisplay] Attaching screen stream to video element.");
      if (videoRef.current.srcObject !== screenStream) {
        videoRef.current.srcObject = screenStream;
        videoRef.current.muted = true; // Mute local playback
        videoRef.current.play().catch(err => {
          console.error("Error playing local screen share stream:", err);
        });
      }
    } else if (!isScreenSharingActive && videoRef.current && videoRef.current.srcObject) {
      console.log("[ScreenShareDisplay] Detaching screen stream and pausing video.");
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }, [screenStream, isScreenSharingActive]);

  if (!isScreenSharingActive) {
    return null;
  }

  return (
    <div className="screen-share-container bg-black rounded-md overflow-hidden shadow-lg absolute bottom-20 left-5 w-64 h-48 z-50 border border-gray-700"> {/* Adjusted size slightly */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain" // Use object-contain for screen shares
        playsInline
      />
      <p className="absolute bottom-1 left-1 text-xs text-white bg-black bg-opacity-50 px-1 rounded">Your Screen Share</p>
    </div>
  );
}

export default ScreenShareDisplay; 