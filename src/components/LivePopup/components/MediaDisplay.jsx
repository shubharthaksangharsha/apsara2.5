import React, { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import VideoStreamDisplay from '../../VideoStreamDisplay';
import ScreenShareDisplay from '../../ScreenShareDisplay';
import AudioVisualizer from './AudioVisualizer';
import { useSpeechDetection } from '../../../hooks/useSpeechDetection';
import { useAudioOutputCapture } from '../../../hooks/useAudioOutputCapture';

/**
 * MediaDisplay component for displaying video stream, screen sharing, and audio visualization
 * This exactly matches the implementation in the original LivePopup2.jsx
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isStreamingVideo - Whether video streaming is active
 * @param {MediaStream} props.mediaStream - Video media stream
 * @param {boolean} props.isStreamingScreen - Whether screen sharing is active
 * @param {MediaStream} props.screenStream - Screen share media stream
 * @param {boolean} props.isModelSpeaking - Whether the model is currently speaking
 * @param {boolean} props.isUserSpeaking - Whether the user is currently speaking (from recording state)
 * @param {string} props.liveModality - Current modality setting
 * @param {Function} props.flipCamera - Handler for flipping camera
 * @param {MediaStream} props.audioStream - Audio stream for visualization
 * @param {number} props.modelAudioLevel - Model audio level (0-100)
 * @param {Object} props.userProfile - User profile object with name if signed in
 * @returns {JSX.Element} MediaDisplay component
 */
const MediaDisplay = ({
  isStreamingVideo,
  mediaStream,
  isStreamingScreen,
  screenStream,
  isModelSpeaking,
  isUserSpeaking = false,
  liveModality,
  flipCamera,
  audioStream = null,
  modelAudioLevel = 0,
  userProfile = null
}) => {
  const [micStream, setMicStream] = useState(null);
  
  // Use speech detection for user microphone input - EXTREME sensitivity
  const { isSpeaking: isUserActuallySpeaking, audioLevel: userAudioLevel } = useSpeechDetection(
    micStream, 
    1, // EXTREME threshold - detects even breathing/tiny sounds
    10 // Ultra-fast response time
  );

  // Capture real audio output from Apsara's speech
  const { audioLevel: realModelAudioLevel, isPlaying: isAudioPlaying } = useAudioOutputCapture();

  // Setup microphone access for user speech detection
  useEffect(() => {
    const setupMicrophone = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          }
        });
        setMicStream(stream);
      } catch (err) {
        console.warn('Microphone access denied for speech detection:', err);
      }
    };

    // Only setup microphone if we're in audio mode AND actually recording
    if ((liveModality === 'AUDIO' || liveModality === 'AUDIO_TEXT') && isUserSpeaking) {
      setupMicrophone();
    } else {
      // Clean up mic stream if not recording
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        setMicStream(null);
      }
    }

    return () => {
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [liveModality, isUserSpeaking]);

  // Generate simulated model audio level based on speaking state
  // Now we use real audio capture when available, fallback to simulation
  const [simulatedModelLevel, setSimulatedModelLevel] = useState(0);
  
  useEffect(() => {
    // Only use simulation if we don't have real audio output
    if (isModelSpeaking && !isAudioPlaying) {
      const interval = setInterval(() => {
        // More realistic and dynamic audio levels when model is speaking
        const time = Date.now() / 1000;
        const baseLevel = 50 + Math.sin(time * 0.5) * 15; // Smooth base variation 35-65
        const speechPattern = Math.sin(time * 2) * 10 + Math.sin(time * 3.5) * 8; // Speech-like pattern
        const microVariation = (Math.random() - 0.5) * 15; // Random variation
        const finalLevel = Math.max(20, Math.min(85, baseLevel + speechPattern + microVariation));
        setSimulatedModelLevel(finalLevel);
      }, 30); // Very responsive updates
      
      return () => clearInterval(interval);
    } else {
      setSimulatedModelLevel(0);
    }
  }, [isModelSpeaking, isAudioPlaying]);

  // Use real audio level if available, otherwise use provided level or simulation
  const effectiveModelAudioLevel = isAudioPlaying && realModelAudioLevel > 0 
    ? realModelAudioLevel 
    : (isModelSpeaking ? simulatedModelLevel : 0);

  // Get user display name
  const getUserDisplayName = () => {
    if (userProfile && userProfile.name) {
      // If user is signed in, use their first name
      return userProfile.name.split(' ')[0];
    }
    return 'You';
  };

  // Debug logging
  useEffect(() => {
    console.log('🎙️ MediaDisplay State:', {
      isModelSpeaking,
      isUserSpeaking,
      isAudioPlaying,
      realModelAudioLevel,
      simulatedModelLevel,
      effectiveModelAudioLevel,
      userAudioLevel,
      isUserActuallySpeaking,
      hasMicStream: !!micStream,
      liveModality
    });
  }, [isModelSpeaking, isUserSpeaking, isAudioPlaying, realModelAudioLevel, simulatedModelLevel, effectiveModelAudioLevel, userAudioLevel, isUserActuallySpeaking, micStream, liveModality]);

  return (
    <div className="flex-grow space-y-2 my-2 overflow-hidden flex flex-col">
      {/* Mobile: Horizontal layout for camera and screen share */}
      <div className="flex flex-row md:flex-col gap-2 w-full">
        {/* Video Stream Area - Smaller and side-by-side on mobile */}
        <div className="w-1/2 md:w-full aspect-video bg-gray-200 dark:bg-gray-700/50 rounded border dark:border-gray-600/50 flex items-center justify-center overflow-hidden min-h-[5rem] md:min-h-0 md:max-h-36"> 
          {isStreamingVideo && mediaStream ? (
            <VideoStreamDisplay 
              videoStream={mediaStream} 
              isWebcamActive={isStreamingVideo} 
              onSwitchCamera={flipCamera}
              isFlipAvailable={true}
            /> 
          ) : (
            <span className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500">Your Camera</span>
          )}
        </div>
        
        {/* Screen Share Area - Smaller and side-by-side on mobile */}
        <div className="w-1/2 md:w-full aspect-video bg-gray-200 dark:bg-gray-700/50 rounded border dark:border-gray-600/50 flex items-center justify-center overflow-hidden min-h-[5rem] md:min-h-0 md:max-h-36"> 
          {isStreamingScreen && screenStream ? (
            <ScreenShareDisplay screenStream={screenStream} isScreenSharingActive={isStreamingScreen} /> 
          ) : (
            <span className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500">Screen Share</span>
          )}
        </div>
      </div>

      {/* Advanced Audio Visualizer - Only show when audio modes are active */}
      {(liveModality === 'AUDIO' || liveModality === 'AUDIO_TEXT') && (
        <div className="h-12 sm:h-14 flex items-center justify-center mt-4 flex-shrink-0 px-2">
          <div className="w-full max-w-md mx-auto">
            <AudioVisualizer
              isModelSpeaking={isModelSpeaking}
              isUserSpeaking={micStream && (isUserActuallySpeaking || isUserSpeaking)} // Only show user if mic exists
              audioStream={micStream}
              size="small"
              showLabel={true}
              className="shadow-lg w-full"
              userAudioLevel={userAudioLevel}
              modelAudioLevel={effectiveModelAudioLevel}
              priority="auto" // Auto-switch based on who's speaking
              userDisplayName={getUserDisplayName()}
              hasMicrophone={!!micStream} // Pass mic availability
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaDisplay; 