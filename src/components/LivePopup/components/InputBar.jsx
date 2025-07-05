import React from 'react';
import { Send, Paperclip, Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff } from 'lucide-react';

/**
 * InputBar component for chat input and media controls
 * 
 * @param {Object} props - Component props
 * @param {string} props.inputText - Current input text
 * @param {Function} props.setInputText - Handler for updating input text
 * @param {Function} props.handleSendMessage - Handler for sending message
 * @param {boolean} props.isConnected - Whether connection is active
 * @param {boolean} props.isRecording - Whether audio recording is active
 * @param {boolean} props.isStreamingVideo - Whether video streaming is active
 * @param {boolean} props.isStreamingScreen - Whether screen sharing is active
 * @param {Function} props.onStartRecording - Handler for starting recording
 * @param {Function} props.onStopRecording - Handler for stopping recording
 * @param {Function} props.handleVideoToggle - Handler for toggling video
 * @param {Function} props.onStartScreenShare - Handler for starting screen share
 * @param {Function} props.onStopScreenShare - Handler for stopping screen share
 * @param {string} props.audioError - Audio error message if any
 * @returns {JSX.Element} InputBar component
 */
const InputBar = ({ 
  inputText, 
  setInputText, 
  handleSendMessage, 
  isConnected, 
  isRecording, 
  isStreamingVideo, 
  isStreamingScreen,
  onStartRecording,
  onStopRecording,
  handleVideoToggle,
  onStartScreenShare,
  onStopScreenShare,
  audioError
}) => {
  return (
    <>
      <div className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-700/60 rounded-lg p-2 shadow-sm border-t dark:border-gray-600/50 mt-auto flex-shrink-0">
        {/* Media controls - Moved to top with larger size for mobile */}
        <div className="flex justify-center gap-3 py-1">
          <button
            onClick={() => { if (isRecording) onStopRecording(); else onStartRecording(); }}
            className={`p-2.5 rounded-lg transition-colors focus:outline-none ${
              isRecording ? 'bg-red-100 dark:bg-red-700/50 text-red-600 dark:text-red-300 animate-pulse'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300'}`}
            aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
          > 
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />} 
          </button>
          <button
            onClick={handleVideoToggle}
            className={`p-2.5 rounded-lg transition-colors focus:outline-none ${
              isStreamingVideo ? 'bg-blue-100 dark:bg-blue-700/50 text-blue-600 dark:text-blue-300 animate-pulse'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300'}`}
            aria-label={isStreamingVideo ? 'Stop Video' : 'Start Video'}
          > 
            {isStreamingVideo ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />} 
          </button>
          <button
            onClick={() => { if (isStreamingScreen) onStopScreenShare(); else onStartScreenShare(); }}
            className={`p-2.5 rounded-lg transition-colors focus:outline-none ${
              isStreamingScreen ? 'bg-green-100 dark:bg-green-700/50 text-green-600 dark:text-green-300 animate-pulse'
                               : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300'}`}
            aria-label={isStreamingScreen ? 'Stop Screen Share' : 'Start Screen Share'}
          > 
            {isStreamingScreen ? <ScreenShareOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />} 
          </button>
        </div>
        
        {/* Message input - Separate row from media buttons */}
        <div className="relative flex-1">
          <input
            type="text" 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
            className="w-full p-2 pl-8 pr-8 border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
            placeholder="Type a message..." 
            disabled={!isConnected}
          />
          <button 
            title="Attach file" 
            className="absolute left-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 dark:text-gray-300"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            onClick={handleSendMessage} 
            disabled={!isConnected || !inputText.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-white bg-indigo-500 rounded-md hover:bg-indigo-600 disabled:opacity-50"
            aria-label="Send Message"
          > 
            <Send className="h-4 w-4" /> 
          </button>
        </div>
      </div>
      
      {audioError && (
        <div className="p-1.5 mt-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs rounded-md text-center">
          Audio Error: {audioError}
        </div>
      )}
    </>
  );
};

export default InputBar; 