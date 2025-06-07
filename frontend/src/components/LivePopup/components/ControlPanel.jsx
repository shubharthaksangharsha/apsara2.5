import React from 'react';
import { Mic, MicOff, Video, VideoOff, MonitorPlay, MonitorOff, Settings, Save, X } from 'lucide-react';

/**
 * Control panel component for live session controls
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isRecording - Whether audio recording is active
 * @param {boolean} props.isStreamingVideo - Whether video streaming is active
 * @param {boolean} props.isStreamingScreen - Whether screen sharing is active
 * @param {boolean} props.settingsOpen - Whether settings panel is open
 * @param {boolean} props.hasSessionHandle - Whether there's an active session handle
 * @param {Function} props.onStartRecording - Handler for starting audio recording
 * @param {Function} props.onStopRecording - Handler for stopping audio recording
 * @param {Function} props.onStartVideo - Handler for starting video stream
 * @param {Function} props.onStopVideo - Handler for stopping video stream
 * @param {Function} props.onStartScreenShare - Handler for starting screen share
 * @param {Function} props.onStopScreenShare - Handler for stopping screen share
 * @param {Function} props.onToggleSettings - Handler for toggling settings panel
 * @param {Function} props.onSaveSession - Handler for saving session
 * @param {Function} props.onClose - Handler for closing the popup
 * @returns {JSX.Element} ControlPanel component
 */
const ControlPanel = ({
  isRecording,
  isStreamingVideo,
  isStreamingScreen,
  settingsOpen,
  hasSessionHandle,
  onStartRecording,
  onStopRecording,
  onStartVideo,
  onStopVideo,
  onStartScreenShare,
  onStopScreenShare,
  onToggleSettings,
  onSaveSession,
  onClose
}) => {
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
      {/* Left side controls */}
      <div className="flex items-center gap-1.5">
        {/* Mic toggle */}
        <button
          onClick={isRecording ? onStopRecording : onStartRecording}
          className={`p-1.5 rounded-full ${isRecording ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'} hover:opacity-80 transition-all`}
          title={isRecording ? "Stop Recording" : "Start Recording"}
        >
          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        
        {/* Camera toggle */}
        <button
          onClick={isStreamingVideo ? onStopVideo : onStartVideo}
          className={`p-1.5 rounded-full ${isStreamingVideo ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'} hover:opacity-80 transition-all`}
          title={isStreamingVideo ? "Stop Camera" : "Start Camera"}
        >
          {isStreamingVideo ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
        </button>
        
        {/* Screen share toggle */}
        <button
          onClick={isStreamingScreen ? onStopScreenShare : onStartScreenShare}
          className={`p-1.5 rounded-full ${isStreamingScreen ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'} hover:opacity-80 transition-all`}
          title={isStreamingScreen ? "Stop Screen Share" : "Share Screen"}
        >
          {isStreamingScreen ? <MonitorOff className="h-4 w-4" /> : <MonitorPlay className="h-4 w-4" />}
        </button>
      </div>
      
      {/* Right side controls */}
      <div className="flex items-center gap-1.5">
        {/* Settings button */}
        <button
          onClick={onToggleSettings}
          className={`p-1.5 rounded-full ${settingsOpen ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'} hover:opacity-80 transition-all`}
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
        
        {/* Save session button - only if there's a session handle */}
        {hasSessionHandle && (
          <button
            onClick={onSaveSession}
            className="p-1.5 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:opacity-80 transition-all"
            title="Save Session"
          >
            <Save className="h-4 w-4" />
          </button>
        )}
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-all"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ControlPanel; 