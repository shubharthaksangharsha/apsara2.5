import React, { useEffect, useRef, useState } from 'react';
import CameraFlipButton from './components/CameraFlipButton';
import { 
  CONTAINER_CLASS, 
  VIDEO_CLASS, 
  BOTTOM_BAR_CLASS, 
  LABEL_CLASS, 
  CAMERA_LABEL 
} from './constants';

/**
 * Component for displaying a camera video stream.
 * 
 * @param {Object} props - Component props
 * @param {MediaStream} props.videoStream - The MediaStream object for video
 * @param {Function} props.onFlipCamera - Handler for when the flip camera button is clicked
 * @param {Function} props.onSwitchCamera - Alternative prop for onFlipCamera (for backward compatibility)
 * @param {boolean} props.cameraEnabled - Whether the camera is currently enabled
 * @param {boolean} props.isWebcamActive - Alternative prop for cameraEnabled (for backward compatibility)
 * @param {boolean} props.isFlipAvailable - Whether a flip camera option is available
 * @returns {JSX.Element|null} VideoStreamDisplay component or null if camera disabled
 */
export default function VideoStreamDisplay({ 
  videoStream, 
  onFlipCamera, 
  onSwitchCamera,
  cameraEnabled,
  isWebcamActive,
  isFlipAvailable = false
}) {
  const videoRef = useRef(null);
  const [hasAttached, setHasAttached] = useState(false);
  
  // Support both prop naming conventions for backward compatibility
  const isCameraEnabled = cameraEnabled !== undefined ? cameraEnabled : isWebcamActive;
  const flipCameraHandler = onFlipCamera || onSwitchCamera;

  // Attach or detach the video stream when camera enabled state changes
  useEffect(() => {
    const videoElement = videoRef.current;
    
    if (videoElement && isCameraEnabled && videoStream) {
      console.log('[VideoStreamDisplay] Attaching video stream');
      if (videoElement.srcObject !== videoStream) {
        videoElement.srcObject = videoStream;
        
        // Start playback with error handling
        videoElement.play().catch(err => {
          console.error('[VideoStreamDisplay] Error playing video stream:', err);
        });
        
        setHasAttached(true);
      }
    } else if (videoElement && (!isCameraEnabled || !videoStream)) {
      console.log('[VideoStreamDisplay] Detaching video stream');
      // Clean up the video element when disabled
      if (videoElement.srcObject) {
        videoElement.pause();
        videoElement.srcObject = null;
        setHasAttached(false);
      }
    }
    
    return () => {
      // Clean up resources when component unmounts
      if (videoElement && videoElement.srcObject) {
        videoElement.pause();
        videoElement.srcObject = null;
      }
    };
  }, [videoStream, isCameraEnabled]);

  // Don't render anything if camera is disabled
  if (!isCameraEnabled) return null;

  return (
    <div className={CONTAINER_CLASS}>
      <video
        ref={videoRef}
        className={VIDEO_CLASS}
        autoPlay
        playsInline
        muted // Mute local playback to prevent audio feedback
      />
      <div className={BOTTOM_BAR_CLASS}>
        <div className={LABEL_CLASS}>{CAMERA_LABEL}</div>
        {isFlipAvailable && flipCameraHandler && (
          <CameraFlipButton 
            onClick={flipCameraHandler} 
            disabled={!hasAttached} 
          />
        )}
      </div>
    </div>
  );
} 