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
    <div className="video-stream-container bg-white/20 dark:bg-gray-900/40 backdrop-blur-lg rounded-2xl overflow-hidden shadow-2xl fixed top-5 right-5 w-56 h-40 z-[60] border-2 border-indigo-400/60 dark:border-indigo-500/60 ring-2 ring-indigo-300/30 dark:ring-indigo-700/30">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
      />
      <p className="absolute bottom-2 left-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded-full shadow">Your Camera</p>
    </div>
  );
}

export default VideoStreamDisplay; 