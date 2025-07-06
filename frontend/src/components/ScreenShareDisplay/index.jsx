import React, { useEffect, useRef } from 'react';
import { 
  CONTAINER_CLASS, 
  VIDEO_CLASS, 
  LABEL_CLASS, 
  SCREEN_SHARE_LABEL 
} from './constants';

/**
 * Displays the local screen share stream.
 *
 * @param {Object} props - Component props
 * @param {MediaStream} props.screenStream - The MediaStream object from screen capture
 * @param {boolean} props.isScreenSharingActive - Whether screen sharing is currently active
 * @returns {JSX.Element|null} ScreenShareDisplay component or null if sharing inactive
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
    <div className={CONTAINER_CLASS}>
      <video
        ref={videoRef}
        className={VIDEO_CLASS}
        playsInline
      />
      <p className={LABEL_CLASS}>{SCREEN_SHARE_LABEL}</p>
    </div>
  );
}

export default ScreenShareDisplay; 