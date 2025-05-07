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

  // Position below the camera view if active, otherwise top-right.
  // Assuming camera view height is roughly 10rem (160px) + 1.25rem (20px) for top-5.
  // Adjust this value (top-48) if camera size/position changes.
  return (
    <div className="screen-share-container bg-white/20 dark:bg-gray-900/40 backdrop-blur-lg rounded-2xl overflow-hidden shadow-2xl fixed top-48 right-5 w-80 h-52 z-[60] border-2 border-green-400/60 dark:border-green-500/60 ring-2 ring-green-300/30 dark:ring-green-700/30">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
      />
      <p className="absolute bottom-2 left-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded-full shadow">Your Screen Share</p>
    </div>
  );
}

export default ScreenShareDisplay; 