import React from 'react';
import { Volume2 } from 'lucide-react';
import VideoStreamDisplay from '../../VideoStreamDisplay';
import ScreenShareDisplay from '../../ScreenShareDisplay';

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
 * @param {string} props.liveModality - Current modality setting
 * @param {Function} props.flipCamera - Handler for flipping camera
 * @returns {JSX.Element} MediaDisplay component
 */
const MediaDisplay = ({
  isStreamingVideo,
  mediaStream,
  isStreamingScreen,
  screenStream,
  isModelSpeaking,
  liveModality,
  flipCamera
}) => {
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

      {/* Audio Visualizer - Below media placeholders/streams */}
      <div className="h-6 sm:h-8 flex items-center justify-center mt-1 flex-shrink-0">
        {(isModelSpeaking && (liveModality === 'AUDIO' || liveModality === 'AUDIO_TEXT')) && (
          <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-gray-100 dark:bg-gray-700/80 backdrop-blur-sm rounded-full shadow-inner">
            <Volume2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-500 animate-pulse"/>
            <div className="w-0.5 sm:w-1 h-2 sm:h-2.5 bg-blue-500 rounded-full animate-pulse-audio delay-75"></div>
            <div className="w-0.5 sm:w-1 h-3 sm:h-3.5 bg-blue-500 rounded-full animate-pulse-audio delay-150"></div>
            <div className="w-0.5 sm:w-1 h-2 sm:h-2.5 bg-blue-500 rounded-full animate-pulse-audio delay-300"></div>
            <span className="text-[9px] sm:text-[10px] text-gray-600 dark:text-gray-300 ml-0.5 sm:ml-1">Speaking</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaDisplay; 