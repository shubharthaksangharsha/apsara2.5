import React, { useState, useEffect, useRef } from 'react';
import { TABS } from './constants';
import { Clock, Save, MessageSquare, X, Send, Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, ClipboardCopy, Settings as SettingsIcon, Paperclip, Info, MapPin, Code2, Terminal, CalendarDays, Users, Sun, ChevronDown, ChevronUp, Volume2, RefreshCw, PlusCircle, Calendar as CalendarIcon, AudioLines, FolderOpen, Play, HelpCircle } from 'lucide-react';

// Import components
import Header from './components/Header';
import TabBar from './components/TabBar';
import LogsPanel from './components/LogsPanel';
import ChatTab from './components/ChatTab';
import CodeTab from './components/CodeTab';
import MapTab from './components/MapTab';
import WeatherTab from './components/WeatherTab';
import CalendarTab from './components/CalendarTab';
import InputBar from './components/InputBar';
import CameraSelectorModal from './components/CameraSelectorModal';
import SaveSessionDialog from './components/SaveSessionDialog';
import CreateEventModal from './components/CreateEventModal';
import MediaDisplay from './components/MediaDisplay';

// Import helper functions
import { renderChatMessageContent, renderMessageContent, getStatusIndicator } from './components/MessageHelpers';

// Import session storage functions
import { saveSession } from '../../utils/liveSessionStorage';

// Import other components
import ModelSelector from '../ModelSelector';
import SavedSessionsPanel from '../SavedSessionsPanel';

/**
 * LivePopup component - Main container for real-time AI interactions
 * 
 * @param {Object} props - Component props
 * @returns {JSX.Element} LivePopup component
 */
export default function LivePopup({
  // State props
  connectionStatus,
  messages,
  currentVoice,
  voices,
  audioError,
  liveModality,
  liveSystemInstruction,
  sessionTimeLeft,
  isRecording,
  isModelSpeaking,
  isStreamingVideo,
  mediaStream,
  isStreamingScreen,
  screenStream,
  videoDevices,
  selectedVideoDeviceId,
  mapDisplayData,
  weatherUIData,
  currentSessionHandle,
  calendarEvents,
  calendarEventsLastUpdated,
  transcriptionEnabled,
  slidingWindowEnabled,
  slidingWindowTokens,
  activeTab,
  setActiveTab,
  selectedModel,
  setSelectedModel,
  
  // Handler props
  onVoiceChange,
  onModalityChange,
  onSystemInstructionChange, 
  onClose, 
  onStartSession, 
  onEndSession, 
  onSendMessage,
  onStartRecording, 
  onStopRecording, 
  onStartVideo,
  onStopVideo,
  onStartScreenShare,
  onStopScreenShare,
  onSetSelectedVideoDeviceId,
  onGetVideoInputDevices,
  flipCamera,
  setTranscriptionEnabled,
  setSlidingWindowEnabled,
  setSlidingWindowTokens,
  onAutoResumeSession,
  onLoadSession,
  onStartWithMainContext,
  startedWithMainContext = false,
  setSessionResumeHandle,
  onNativeAudioFeatureChange,
  nativeAudioFeature,
  mediaResolution,
  onMediaResolutionChange
}) {
  // Local state
  const [inputText, setInputText] = useState('');
  const [tempSystemInstruction, setTempSystemInstruction] = useState(liveSystemInstruction);
  const [copiedContent, setCopiedContent] = useState(null);
  const [showCameraSelector, setShowCameraSelector] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [isSystemInstructionExpanded, setIsSystemInstructionExpanded] = useState(false);
  const prevCalendarEventsLastUpdatedRef = useRef(0);
  
  // Save session state
  const [showSavedSessions, setShowSavedSessions] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  // Create event modal state
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [newEventForm, setNewEventForm] = useState({
    summary: '',
    startDateTime: '',
    endDateTime: '',
    description: '',
    location: '',
    attendees: '',
  });

  // Calculate if session is active
  const isSessionActive = connectionStatus === 'connected' || connectionStatus === 'connecting';

  // Update local temp instruction if the main prop changes
  useEffect(() => {
    setTempSystemInstruction(liveSystemInstruction);
  }, [liveSystemInstruction]);

  // Fetch video devices when popup opens or connection status changes
  useEffect(() => {
    if (connectionStatus === 'connected' || !isSessionActive) { // Fetch if connected or if settings are visible
      onGetVideoInputDevices();
    }
  }, [onGetVideoInputDevices, connectionStatus, isSessionActive]);

  // Handlers
  const handleSendMessage = () => {
    if (!inputText.trim() || connectionStatus !== 'connected') return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleStartSession = () => {
    onSystemInstructionChange(tempSystemInstruction);
    
    // Clear any existing session handle to ensure we always start a new session
    if (setSessionResumeHandle) {
      setSessionResumeHandle(null);
    }
    
    // Call App's start function without any context to start a fresh session
    onStartSession(); 
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCopyContent = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedContent(id);
    setTimeout(() => setCopiedContent(null), 1200);
  };

  const handleVideoToggle = async () => {
    if (isStreamingVideo) {
      onStopVideo();
    } else {
      // Refresh device list just in case
      const currentDevices = await onGetVideoInputDevices();
      if (currentDevices && currentDevices.length > 1) {
        setShowCameraSelector(true); // Show selector if multiple cameras
      } else if (currentDevices && currentDevices.length === 1) {
        // If only one camera, use it directly
        onSetSelectedVideoDeviceId(currentDevices[0].deviceId);
        onStartVideo(currentDevices[0].deviceId);
      } else {
        // No cameras or only default, start with no specific ID
        onStartVideo();
      }
    }
  };

  const handleCameraSelect = (deviceId) => {
    onSetSelectedVideoDeviceId(deviceId);
    onStartVideo(deviceId);
    setShowCameraSelector(false);
  };

  const handleSaveCurrentSession = () => {
    // Only allow saving if we have a current session and a handle
    if (isSessionActive && currentSessionHandle) {
      setShowSaveDialog(true);
    } else {
      alert("No active session to save");
    }
  };

  const saveCurrentSession = () => {
    if (!currentSessionHandle) return;
    
    const sessionData = {
      id: Date.now().toString(), // Unique ID for the saved session
      title: sessionTitle || `Chat Session ${new Date().toLocaleString()}`,
      timestamp: Date.now(),
      resumeHandle: currentSessionHandle,
      messageCount: messages.filter(msg => msg.role === 'user' || msg.role === 'model').length,
      modality: liveModality,
      voice: currentVoice,
      systemInstruction: liveSystemInstruction
    };
    
    const success = saveSession(sessionData);
    
    if (success) {
      setShowSaveDialog(false);
      setSessionTitle("");
      alert("Session saved successfully!");
    } else {
      alert("Failed to save session");
    }
  };

  const handleSelectSavedSession = (session) => {
    setShowSavedSessions(false);
    
    // If we're currently in an active session, confirm before loading
    if (isSessionActive) {
      if (window.confirm("This will end your current session. Continue?")) {
        onEndSession();
        setTimeout(() => {
          // Resume with the selected session's handle
          if (onLoadSession) {
            onLoadSession(session.resumeHandle, session.modality, session.voice, session.systemInstruction);
          }
        }, 500);
      }
    } else {
      // If no active session, just load directly
      if (onLoadSession) {
        onLoadSession(session.resumeHandle, session.modality, session.voice, session.systemInstruction);
      }
    }
  };

  const handleRefreshCalendar = () => {
    if (connectionStatus === 'connected') {
      onSendMessage("list my upcoming calendar events");
    }
  };

  const handleNewEventFormChange = (newFormData) => {
    setNewEventForm(newFormData);
  };

  const handleCreateEventSubmit = () => {
    if (connectionStatus !== 'connected') return;
    if (!newEventForm.summary.trim() || !newEventForm.startDateTime.trim() || !newEventForm.endDateTime.trim()) {
      alert("Please fill in Summary, Start Date/Time, and End Date/Time."); // Basic validation
      return;
    }

    // Construct a detailed message for the AI
    let command = `Create a calendar event.`;
    command += ` Summary is "${newEventForm.summary.trim()}".`;
    command += ` Start time is "${newEventForm.startDateTime.trim()}".`;
    command += ` End time is "${newEventForm.endDateTime.trim()}".`;
    if (newEventForm.description.trim()) {
      command += ` Description is "${newEventForm.description.trim()}".`;
    }
    if (newEventForm.location.trim()) {
      command += ` Location is "${newEventForm.location.trim()}".`;
    }
    if (newEventForm.attendees.trim()) {
      // Split attendees by comma, trim whitespace, and filter out empty strings
      const attendeeList = newEventForm.attendees.split(',')
                              .map(email => email.trim())
                              .filter(email => email);
      if (attendeeList.length > 0) {
        command += ` Attendees are ${attendeeList.join(', ')}.`;
      }
    }
    
    onSendMessage(command);

    // Close modal and reset form
    setIsCreateEventModalOpen(false);
    setNewEventForm({
      summary: '',
      startDateTime: '',
      endDateTime: '',
      description: '',
      location: '',
      attendees: ''
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-center items-center bg-black/50 backdrop-blur-md p-0 md:p-4"
      onClick={handleOverlayClick}
    >
      <div
        className="w-full h-full md:w-[95vw] md:h-[95vh] md:max-w-[1600px] md:max-h-[1000px] bg-white/80 dark:bg-gray-900/85 backdrop-blur-xl md:border border-gray-300 dark:border-gray-700 md:rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <Header connectionStatus={connectionStatus} onClose={onClose} />

        {/* Main Content Area */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden p-1.5 sm:p-3 gap-1.5 sm:gap-3">
          {/* Left Panel - Event Logs */}
          <LogsPanel messages={messages} />

          {/* Center Panel - Content */}
          <div className="flex-1 flex flex-col bg-white/70 dark:bg-gray-800/70 p-1.5 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Tab Navigation */}
            <TabBar activeTab={activeTab} setActiveTab={setActiveTab} connectionStatus={connectionStatus} />

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mb-1.5 sm:mb-3">
              {activeTab === 'chat' && (
                <ChatTab 
                  messages={messages} 
                  isSessionActive={isSessionActive} 
                  renderChatMessageContent={renderChatMessageContent} 
                />
              )}
              {activeTab === 'code' && (
                <CodeTab 
                  messages={messages} 
                  copiedContent={copiedContent} 
                  handleCopyContent={handleCopyContent} 
                />
              )}
              {activeTab === 'map' && (
                <MapTab mapDisplayData={mapDisplayData} />
              )}
              {activeTab === 'weather' && (
                <WeatherTab weatherUIData={weatherUIData} />
              )}
              {activeTab === 'calendar' && (
                <CalendarTab
                  calendarEvents={calendarEvents}
                  connectionStatus={connectionStatus}
                  onRefreshCalendar={() => {
                    if (connectionStatus === 'connected') {
                      onSendMessage("list my upcoming calendar events");
                    }
                  }}
                  setIsCreateEventModalOpen={setIsCreateEventModalOpen}
                />
              )}
            </div>

            {/* Input Bar - Only show when connected */}
            {connectionStatus === 'connected' && (
              <InputBar 
                inputText={inputText}
                setInputText={setInputText}
                handleSendMessage={handleSendMessage}
                isConnected={connectionStatus === 'connected'}
                isRecording={isRecording}
                isStreamingVideo={isStreamingVideo}
                isStreamingScreen={isStreamingScreen}
                onStartRecording={onStartRecording}
                onStopRecording={onStopRecording}
                handleVideoToggle={handleVideoToggle}
                onStartScreenShare={onStartScreenShare}
                onStopScreenShare={onStopScreenShare}
                audioError={audioError}
              />
            )}
          </div>

          {/* Right Settings Panel */}
          <div className="w-full md:w-72 bg-gray-50 dark:bg-gray-800/50 p-2 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col text-xs mt-1.5 md:mt-0 max-h-[35vh] md:max-h-none overflow-y-auto md:overflow-visible">
            <h3 className="text-sm md:text-base font-semibold text-center text-gray-700 dark:text-gray-200 mb-2 border-b dark:border-gray-600 pb-2 flex-shrink-0">
              {isSessionActive ? "Session Active" : "Live Session Settings"}
            </h3>
            
            {!isSessionActive ? (
              <div className="space-y-2 sm:space-y-3 overflow-y-auto custom-scrollbar pr-1 flex-grow">
                {/* Model Selection */}
                <div>
                  <ModelSelector 
                    selectedModel={selectedModel}
                    onSelectModel={(model) => {
                      if (typeof setSelectedModel === 'function') {
                        setSelectedModel(model);
                        // Reset modality to Audio if switching from Flash to other models while Text Only is selected
                        if (model !== 'gemini-2.0-flash-live-001' && liveModality === 'TEXT') {
                          onModalityChange('AUDIO');
                        }
                      } else {
                        console.error('setSelectedModel is not a function');
                      }
                    }}
                    disabled={isSessionActive}
                  />
                  
                  {/* Model capabilities indicator */}
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-50/70 dark:bg-gray-800/40 rounded-md border border-gray-200 dark:border-gray-700">
                    <div className="font-medium mb-1.5 text-gray-600 dark:text-gray-300">Available Tools:</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">
                        <span className="mr-1">✓</span> Search
                      </span>
                      
                      {selectedModel !== 'gemini-2.5-flash-exp-native-audio-thinking-dialog' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">
                          <span className="mr-1">✓</span> Function Calling
                        </span>
                      )}
                      
                      {selectedModel === 'gemini-2.0-flash-live-001' && (
                        <>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">
                            <span className="mr-1">✓</span> Code Execution
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">
                            <span className="mr-1">✓</span> URL Context
                          </span>
                        </>
                      )}
                      
                      {selectedModel === 'gemini-2.5-flash-exp-native-audio-thinking-dialog' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                          <span className="mr-1">★</span> Thinking Capabilities
                        </span>
                      )}
                      
                      {selectedModel !== 'gemini-2.0-flash-live-001' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300">
                          <span className="mr-1">★</span> Enhanced Audio Quality
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="liveSystemInstruction" className="block text-xs font-medium text-gray-600 dark:text-gray-400">System Instruction</label>
                    <button 
                      onClick={() => setIsSystemInstructionExpanded(!isSystemInstructionExpanded)} 
                      className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 flex items-center gap-1"
                    >
                      {isSystemInstructionExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                  {isSystemInstructionExpanded ? (
                    <textarea
                      id="liveSystemInstruction" 
                      rows={window.innerWidth < 768 ? 3 : 5}
                      className="w-full p-2 border rounded-md text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-400 custom-scrollbar"
                      value={tempSystemInstruction} 
                      onChange={(e) => setTempSystemInstruction(e.target.value)} 
                      placeholder="e.g., Respond concisely."
                    />
                  ) : (
                    <div 
                      className="p-2 border rounded-md text-xs bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 truncate cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" 
                      onClick={() => setIsSystemInstructionExpanded(true)}
                    >
                      {tempSystemInstruction || "Default instructions"}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Response Mode</label>
                  <div className="space-y-1">
                    {
                      (selectedModel === 'gemini-2.0-flash-live-001' ?
                        [
                          { value: 'AUDIO', label: 'Audio Only' },
                          { value: 'TEXT', label: 'Text Only' },
                        ] :
                        [
                          { value: 'AUDIO', label: 'Audio Only' },
                        ]
                      ).map(opt => (
                        <label key={opt.value} className="flex items-center space-x-2 cursor-pointer text-xs p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded sm:p-1.5">
                          <input 
                            type="radio" 
                            name="liveModality" 
                            value={opt.value} 
                            checked={liveModality === opt.value} 
                            onChange={() => onModalityChange(opt.value)} 
                            className="text-indigo-600 focus:ring-indigo-500 h-3 w-3 sm:h-3.5 sm:w-3.5"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))
                    }
                  </div>
                </div>
                
                {(liveModality === 'AUDIO' || liveModality === 'AUDIO_TEXT') && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label htmlFor="liveVoiceSelect" className="block text-xs font-medium text-gray-600 dark:text-gray-400">AI Voice</label>
                    </div>
                    
                    <div className="relative">
                      <select
                        id="liveVoiceSelect" 
                        value={currentVoice} 
                        onChange={(e) => onVoiceChange(e.target.value)}
                        className={`w-full p-1.5 sm:p-2 border rounded-md text-xs ${selectedModel?.includes('native-audio') ? 'border-green-300 dark:border-green-600' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 focus:ring-1 focus:ring-indigo-400`}
                      >
                        {voices.length > 0 ? voices.map(v => (
                          <option key={v} value={v}>{v}</option>
                        )) : <option disabled>Loading voices...</option>}
                      </select>
                      
                      {selectedModel?.includes('native-audio') && (
                        <div className="text-[10px] text-green-600 dark:text-green-400 mt-1">
                          Enhanced quality with native audio processing
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Advanced Settings</label>
                  <div className="space-y-2 p-2 border rounded-md text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">Media Resolution</label>
                      <select 
                        className="w-full p-1 border rounded-md text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-400"
                        value={mediaResolution} 
                        onChange={(e) => onMediaResolutionChange(e.target.value)}
                      >
                        {[
                          { value: 'MEDIA_RESOLUTION_LOW', label: 'Low' },
                          { value: 'MEDIA_RESOLUTION_MEDIUM', label: 'Medium' },
                          { value: 'MEDIA_RESOLUTION_HIGH', label: 'High' },
                        ].map(res => (
                          <option key={res.value} value={res.value}>{res.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Advanced Settings */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <input 
                        type="checkbox" 
                        id="transcriptionEnabled" 
                        className="h-3 w-3 text-indigo-600 focus:ring-indigo-500" 
                        checked={transcriptionEnabled} 
                        onChange={e => setTranscriptionEnabled(e.target.checked)} 
                      />
                      <label htmlFor="transcriptionEnabled" className="text-xs text-gray-700 dark:text-gray-300">Enable Transcription</label>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-1">
                      <input 
                        type="checkbox" 
                        id="slidingWindowEnabled" 
                        className="h-3 w-3 text-indigo-600 focus:ring-indigo-500" 
                        checked={slidingWindowEnabled} 
                        onChange={e => setSlidingWindowEnabled(e.target.checked)} 
                      />
                      <label htmlFor="slidingWindowEnabled" className="text-xs text-gray-700 dark:text-gray-300">Enable Sliding Window Compression</label>
                      {slidingWindowEnabled && (
                        <div className="flex items-center">
                          <input 
                            type="number" 
                            min="1000" 
                            max="16000" 
                            step="100" 
                            value={slidingWindowTokens} 
                            onChange={e => setSlidingWindowTokens(Number(e.target.value))} 
                            className="ml-2 w-16 p-1 border rounded text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" 
                          />
                          <span className="text-xs text-gray-500 ml-1">Trigger Tokens</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => setShowSavedSessions(true)}
                    className="w-full px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg shadow hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5"
                  >
                    Load Saved Session
                  </button>
                  
                  <button
                    onClick={handleStartSession} 
                    disabled={connectionStatus === 'connecting'}
                    className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-green-500 text-white text-sm font-semibold rounded-lg shadow hover:bg-green-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {connectionStatus === 'connecting' ? 'Connecting...' : 'Start Session'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-grow">
                {/* Status info with session time remaining */}
                <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mb-1.5 space-y-0.5 flex-shrink-0">
                  <p><strong>Status:</strong> {getStatusIndicator(connectionStatus)}</p>
                  {liveModality && <p><strong>Mode:</strong> {liveModality.replace('_', ' + ')}</p>}
                  {(liveModality === 'AUDIO' || liveModality === 'AUDIO_TEXT') && currentVoice && <p><strong>Voice:</strong> {currentVoice}</p>}
                  {currentSessionHandle && <p><strong>Session ID:</strong> <span className="font-mono text-indigo-600 dark:text-indigo-400 break-all text-[8px] sm:text-xs">{currentSessionHandle.slice(0,8)}...</span></p>}
                  
                  {/* Session Time Display */}
                  {sessionTimeLeft && (
                    <p className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 mt-1">
                      <Clock size={10} /> Session time remaining: {sessionTimeLeft}
                    </p>
                  )}
                </div>
                
                {/* Media Display Component - Make sure this is included */}
                <MediaDisplay
                  isStreamingVideo={isStreamingVideo}
                  mediaStream={mediaStream}
                  isStreamingScreen={isStreamingScreen}
                  screenStream={screenStream}
                  isModelSpeaking={isModelSpeaking}
                  liveModality={liveModality}
                  flipCamera={flipCamera}
                />
                
                <div className="mt-auto flex-shrink-0">
                  {/* Add Save Session button */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleSaveCurrentSession}
                      disabled={!currentSessionHandle}
                      className="w-full px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg shadow hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Session
                    </button>
                    
                    {/* End Session Button */}
                    <button 
                      onClick={onEndSession} 
                      className="w-full px-3 py-1.5 sm:py-2.5 bg-red-500 text-white text-xs font-semibold rounded-lg shadow hover:bg-red-600 transition-colors"
                    >
                      End Session
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Camera Selector Modal */}
        <CameraSelectorModal 
          isOpen={showCameraSelector} 
          onClose={() => setShowCameraSelector(false)} 
          videoDevices={videoDevices}
          onSelectDevice={handleCameraSelect} 
        />

        {/* Save Session Dialog */}
        <SaveSessionDialog 
          isOpen={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          sessionTitle={sessionTitle}
          onSessionTitleChange={setSessionTitle}
          onSave={saveCurrentSession}
        />

        {/* Create Event Modal */}
        <CreateEventModal
          isOpen={isCreateEventModalOpen}
          onClose={() => setIsCreateEventModalOpen(false)}
          formData={newEventForm}
          onFormChange={handleNewEventFormChange}
          onSubmit={handleCreateEventSubmit}
          isConnected={connectionStatus === 'connected'}
        />

        {/* NEW: Saved Sessions Panel */}
        {showSavedSessions && (
          <SavedSessionsPanel
            onClose={() => setShowSavedSessions(false)}
            onSelectSession={handleSelectSavedSession}
          />
        )}
      </div>
    </div>
  );
} 