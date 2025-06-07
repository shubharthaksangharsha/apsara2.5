import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Code2, MapPin, CalendarIcon, Sun, Loader2 } from 'lucide-react';

// Import subcomponents
import TabBar from './components/TabBar';
import ControlPanel from './components/ControlPanel';
import SettingsPanel from './components/SettingsPanel';
import CameraSelectorModal from './components/CameraSelectorModal';
import SaveSessionDialog from './components/SaveSessionDialog';
import CreateEventModal from './components/CreateEventModal';
import Tooltip from './components/Tooltip';
import { renderChatMessageContent, renderMessageContent, getStatusIndicator } from './components/MessageHelpers';

// Import constants
import { TABS, DEFAULT_FORM_VALUES } from './constants';

// Import other components
import VideoStreamDisplay from '../VideoStreamDisplay';
import ScreenShareDisplay from '../ScreenShareDisplay';

/**
 * LivePopup component for real-time interaction
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the popup is open
 * @param {Function} props.onClose - Handler for closing the popup
 * @param {Array} props.models - Available models
 * @param {string} props.selectedModel - Currently selected model ID
 * @param {Function} props.setSelectedModel - Function to update selected model
 * @param {Array} props.messages - Current message list
 * @param {string} props.connectionStatus - Current connection status
 * @param {Function} props.onSendMessage - Handler for sending messages
 * @param {boolean} props.isRecording - Whether audio recording is active
 * @param {boolean} props.isStreamingVideo - Whether video streaming is active
 * @param {boolean} props.isStreamingScreen - Whether screen sharing is active
 * @param {MediaStream} props.mediaStream - Media stream for video/audio
 * @param {MediaStream} props.screenStream - Media stream for screen sharing
 * @param {Function} props.onStartRecording - Handler for starting recording
 * @param {Function} props.onStopRecording - Handler for stopping recording
 * @param {Function} props.onStartVideo - Handler for starting video
 * @param {Function} props.onStopVideo - Handler for stopping video
 * @param {Function} props.onStartScreenShare - Handler for starting screen share
 * @param {Function} props.onStopScreenShare - Handler for stopping screen share
 * @param {Function} props.flipCamera - Handler for flipping camera
 * @param {Array} props.voices - Available voice options
 * @param {string} props.currentVoice - Currently selected voice
 * @param {Function} props.onVoiceChange - Handler for voice changes
 * @param {string} props.liveModality - Current modality setting
 * @param {Function} props.onModalityChange - Handler for modality changes
 * @param {string} props.liveSystemInstruction - Current system instruction
 * @param {Function} props.onSystemInstructionChange - Handler for system instruction changes
 * @param {boolean} props.transcriptionEnabled - Whether transcription is enabled
 * @param {Function} props.setTranscriptionEnabled - Handler for transcription setting
 * @param {boolean} props.slidingWindowEnabled - Whether sliding window is enabled
 * @param {Function} props.setSlidingWindowEnabled - Handler for sliding window setting
 * @param {number} props.slidingWindowTokens - Sliding window token limit
 * @param {Function} props.setSlidingWindowTokens - Handler for sliding window token limit
 * @param {string} props.nativeAudioFeature - Selected native audio feature
 * @param {Function} props.onNativeAudioFeatureChange - Handler for native audio feature changes
 * @param {string} props.mediaResolution - Selected media resolution
 * @param {Function} props.onMediaResolutionChange - Handler for media resolution changes
 * @param {Object} props.mapData - Map data for display
 * @param {string} props.sessionHandle - Current session handle
 * @param {Function} props.onSaveSession - Handler for saving session
 * @returns {JSX.Element|null} LivePopup component
 */
const LivePopup = ({
  isOpen,
  onClose,
  models,
  selectedModel,
  setSelectedModel,
  messages,
  connectionStatus,
  onSendMessage,
  isRecording,
  isStreamingVideo,
  isStreamingScreen,
  mediaStream,
  screenStream,
  onStartRecording,
  onStopRecording,
  onStartVideo,
  onStopVideo,
  onStartScreenShare,
  onStopScreenShare,
  flipCamera,
  voices,
  currentVoice,
  onVoiceChange,
  liveModality,
  onModalityChange,
  liveSystemInstruction,
  onSystemInstructionChange,
  transcriptionEnabled,
  setTranscriptionEnabled,
  slidingWindowEnabled,
  setSlidingWindowEnabled,
  slidingWindowTokens,
  setSlidingWindowTokens,
  nativeAudioFeature,
  onNativeAudioFeatureChange,
  mediaResolution,
  onMediaResolutionChange,
  mapData,
  sessionHandle,
  onSaveSession
}) => {
  // Don't render if not open
  if (!isOpen) return null;
  
  // State for UI elements
  const [activeTab, setActiveTab] = useState('chat');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isCameraSelectorOpen, setIsCameraSelectorOpen] = useState(false);
  const [videoDevices, setVideoDevices] = useState([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventFormData, setEventFormData] = useState(DEFAULT_FORM_VALUES);
  
  // Refs
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  
  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Focus input when popup opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);
  
  // Get available camera devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devices.filter(device => device.kind === 'videoinput');
        setVideoDevices(videoDevs);
      } catch (error) {
        console.error('Error getting video devices:', error);
      }
    };
    
    getDevices();
  }, []);
  
  // Handle sending a message
  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };
  
  // Handle input key press (Enter to send)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Handle camera device selection
  const handleCameraSelect = (deviceId) => {
    onStopVideo();
    setTimeout(() => {
      onStartVideo(deviceId);
      setIsCameraSelectorOpen(false);
    }, 300);
  };
  
  // Handle save session
  const handleSaveSession = () => {
    onSaveSession(sessionTitle);
    setIsSaveDialogOpen(false);
    setSessionTitle('');
  };
  
  // Handle event form changes
  const handleEventFormChange = (e) => {
    const { name, value } = e.target;
    setEventFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle event creation
  const handleCreateEvent = () => {
    console.log('Creating event with data:', eventFormData);
    // Here you would typically send this to a backend API
    setIsEventModalOpen(false);
    setEventFormData(DEFAULT_FORM_VALUES);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Tab Bar */}
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Side - Chat/Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden p-3">
            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeTab === 'chat' && (
                <div ref={chatContainerRef} className="space-y-3 pb-2">
                  {messages.map((msg, idx) => {
                    const content = renderChatMessageContent(msg);
                    if (!content) return null; // Skip messages with no content
                    
                    return (
                      <div 
                        key={`chat-msg-${msg.id || idx}`}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                            msg.role === 'user' 
                              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-gray-800 dark:text-gray-100' 
                              : msg.role === 'system' 
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                          }`}
                        >
                          {content}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
              
              {activeTab === 'code' && (
                <div className="space-y-3 pb-2">
                  {messages.map((msg, idx) => {
                    if (msg.role !== 'model_code' && msg.role !== 'system_code_result') return null;
                    
                    return (
                      <div key={`code-msg-${msg.id || idx}`} className="text-sm">
                        {renderMessageContent(msg)}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {activeTab === 'map' && (
                <div className="h-full flex items-center justify-center">
                  {mapData ? (
                    <div className="w-full h-full">
                      {/* Map component would be rendered here */}
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 h-full flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400">Map data available</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No map data available</p>
                  )}
                </div>
              )}
              
              {activeTab === 'calendar' && (
                <div className="h-full flex flex-col items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No calendar events</p>
                  <button
                    onClick={() => setIsEventModalOpen(true)}
                    className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                  >
                    Create New Event
                  </button>
                </div>
              )}
              
              {activeTab === 'weather' && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">Weather data not available</p>
                </div>
              )}
            </div>
            
            {/* Input Area - Only show for chat tab */}
            {activeTab === 'chat' && (
              <div className="mt-3 flex items-end">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border rounded-lg resize-none h-[40px] max-h-[120px] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 text-sm"
                  rows={1}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="ml-2 p-2 bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            )}
          </div>
          
          {/* Right Side - Settings/Status Area */}
          <div className="w-[220px] border-l border-gray-200 dark:border-gray-700 p-3 flex flex-col">
            {settingsOpen ? (
              <SettingsPanel
                isOpen={settingsOpen}
                voices={voices}
                currentVoice={currentVoice}
                liveModality={liveModality}
                liveSystemInstruction={liveSystemInstruction}
                transcriptionEnabled={transcriptionEnabled}
                slidingWindowEnabled={slidingWindowEnabled}
                slidingWindowTokens={slidingWindowTokens}
                nativeAudioFeature={nativeAudioFeature}
                mediaResolution={mediaResolution}
                models={models}
                selectedModel={selectedModel}
                onVoiceChange={onVoiceChange}
                onModalityChange={onModalityChange}
                onSystemInstructionChange={onSystemInstructionChange}
                setTranscriptionEnabled={setTranscriptionEnabled}
                setSlidingWindowEnabled={setSlidingWindowEnabled}
                setSlidingWindowTokens={setSlidingWindowTokens}
                onNativeAudioFeatureChange={onNativeAudioFeatureChange}
                onMediaResolutionChange={onMediaResolutionChange}
                setSelectedModel={setSelectedModel}
              />
            ) : (
              <div className="h-full flex flex-col">
                {/* Status Section */}
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</h3>
                  <div className="text-xs">{getStatusIndicator(connectionStatus)}</div>
                </div>
                
                {/* Media Streams */}
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Media</h3>
                  <div className="space-y-3">
                    {/* Video Stream Area - Smaller and side-by-side on mobile */}
                    <div className="w-full aspect-video bg-gray-200 dark:bg-gray-700/50 rounded border dark:border-gray-600/50 flex items-center justify-center overflow-hidden min-h-[5rem] md:min-h-0 md:max-h-36"> 
                      {isStreamingVideo && mediaStream ? (
                        <VideoStreamDisplay 
                          videoStream={mediaStream} 
                          isWebcamActive={isStreamingVideo} 
                          onSwitchCamera={() => setIsCameraSelectorOpen(true)}
                          isFlipAvailable={true}
                        /> 
                      ) : (
                        <span className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500">Your camera will appear here</span>
                      )}
                    </div>
                    
                    {/* Screen Share Area */}
                    <div className="w-full aspect-video bg-gray-200 dark:bg-gray-700/50 rounded border dark:border-gray-600/50 flex items-center justify-center overflow-hidden min-h-[5rem] md:min-h-0 md:max-h-36">
                      {isStreamingScreen && screenStream ? (
                        <ScreenShareDisplay screenStream={screenStream} />
                      ) : (
                        <span className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500">Your screen will appear here</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Model Info */}
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Model</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {models.find(m => m.id === selectedModel)?.name || selectedModel}
                  </p>
                </div>
                
                {/* Session Info */}
                {sessionHandle && (
                  <div className="mb-4">
                    <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Session</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {sessionHandle}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Control Panel */}
        <ControlPanel
          isRecording={isRecording}
          isStreamingVideo={isStreamingVideo}
          isStreamingScreen={isStreamingScreen}
          settingsOpen={settingsOpen}
          hasSessionHandle={!!sessionHandle}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
          onStartVideo={onStartVideo}
          onStopVideo={onStopVideo}
          onStartScreenShare={onStartScreenShare}
          onStopScreenShare={onStopScreenShare}
          onToggleSettings={() => setSettingsOpen(!settingsOpen)}
          onSaveSession={() => setIsSaveDialogOpen(true)}
          onClose={onClose}
        />
      </div>
      
      {/* Camera Selector Modal */}
      <CameraSelectorModal
        isOpen={isCameraSelectorOpen}
        videoDevices={videoDevices}
        onClose={() => setIsCameraSelectorOpen(false)}
        onSelect={handleCameraSelect}
      />
      
      {/* Save Session Dialog */}
      <SaveSessionDialog
        isOpen={isSaveDialogOpen}
        sessionTitle={sessionTitle}
        onTitleChange={setSessionTitle}
        onClose={() => setIsSaveDialogOpen(false)}
        onSave={handleSaveSession}
      />
      
      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isEventModalOpen}
        formData={eventFormData}
        onFormChange={handleEventFormChange}
        onClose={() => setIsEventModalOpen(false)}
        onSubmit={handleCreateEvent}
      />
    </div>
  );
};

export default LivePopup; 