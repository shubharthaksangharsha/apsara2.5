import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, ClipboardCopy } from 'lucide-react';

// Helper to render message content with potential icon
const renderMessageContent = (msg) => {
  // --- Handle messages with explicit icons (usually system messages) ---
  if (msg.icon && msg.text) {
    const IconComponent = msg.icon;
    const isSystem = msg.role === 'system';
    return (
      <span className={`flex items-center gap-1.5 ${isSystem ? 'opacity-80 italic' : ''}`}>
        <IconComponent className="h-4 w-4 inline-block opacity-70 flex-shrink-0" />
        <span>{msg.text}</span> {/* Display text alongside icon */}
      </span>
    );
  } else if (msg.role === 'model_code' && msg.code) {
    return (
      <div className="my-1 p-2 bg-gray-100 dark:bg-gray-900/50 rounded-md overflow-x-auto custom-scrollbar text-xs">
        <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">Executable Code ({msg.code.language || 'PYTHON'}):</span>
        <pre><code className={`language-${msg.code.language?.toLowerCase() || 'python'}`}>
          {msg.code.code}
        </code></pre>
      </div>
    );
  } else if (msg.role === 'system_code_result' && msg.result) {
    const isError = msg.result.outcome !== 'OUTCOME_OK';
    const borderColor = isError ? 'border-red-500 dark:border-red-400' : 'border-green-500 dark:border-green-400';
    const bgColor = isError ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20';
    return (
      <div className={`my-1 p-1.5 border-l-4 ${borderColor} ${bgColor} text-xs`}>
        <pre className="whitespace-pre-wrap font-mono text-xs">Output ({msg.result.outcome}): {msg.result.output}</pre>
      </div>
    );
  }


  // --- Handle messages structured with parts (model/user/function) ---
  if (Array.isArray(msg.parts)) {
    return msg.parts.map((part, i) => {
      if (part.text) {
        return <div key={`part-text-${i}`} className="whitespace-pre-wrap">{part.text}</div>;
      } else if (part.inlineData?.mimeType?.startsWith('image/')) {
        return (
          <div key={`part-img-${i}`} className="my-2">
            <img
              src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
              alt="Generated content"
              className="max-w-full h-auto rounded-md border dark:border-gray-600" // Added border
            />
          </div>
        );
      } else if (part.executableCode) {
        return (
          <div key={`part-code-${i}`} className="my-1 p-2 bg-gray-100 dark:bg-gray-900/50 rounded-md overflow-x-auto custom-scrollbar text-xs">
            <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">Executable Code ({part.executableCode.language || 'PYTHON'}):</span>
            <pre><code className={`language-${part.executableCode.language?.toLowerCase() || 'python'}`}>{part.executableCode.code}</code></pre>
          </div>
        );
      } else if (part.codeExecutionResult) {
        const isError = part.codeExecutionResult.outcome !== 'OUTCOME_OK';
        const borderColor = isError ? 'border-red-500 dark:border-red-400' : 'border-green-500 dark:border-green-400';
        const bgColor = isError ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20';
        return (
          <div key={`part-coderesult-${i}`} className={`my-1 p-1.5 border-l-4 ${borderColor} ${bgColor} text-xs`}>
            <pre className="whitespace-pre-wrap font-mono text-xs">Output ({part.codeExecutionResult.outcome}): {part.codeExecutionResult.output}</pre>
          </div>
        );
      } else {
        return null; // Ignore other part types for now
      }
    });
  }

  // --- Fallback for simple text messages (if parts logic fails or msg has no parts) ---
  return msg.text || null;
};

// Helper to get status indicator JSX
const getStatusIndicator = (connectionStatus) => {
  switch (connectionStatus) {
    case 'connecting': return <span className="text-yellow-500 flex items-center gap-1.5"><div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>Connecting...</span>;
    case 'connected': return <span className="text-green-500 flex items-center gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-full"></div>Connected</span>;
    case 'error': return <span className="text-red-500 flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500 rounded-full"></div>Error</span>;
    case 'disconnected': return <span className="text-gray-500 flex items-center gap-1.5"><div className="w-2 h-2 bg-gray-500 rounded-full"></div>Disconnected</span>;
    default: return <span className="text-gray-500">Unknown</span>;
  }
};

export default function LivePopup({
  // State from App.jsx
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
  mediaStream, // Receives the actual stream object now
  isStreamingScreen, // <-- New prop
  screenStream,      // <-- New prop
  videoDevices, // <-- New prop
  selectedVideoDeviceId, // <-- New prop
  
  // Handlers from App.jsx
  onVoiceChange, 
  onModalityChange, 
  onSystemInstructionChange, // Should accept the new value
  onClose, 
  onStartSession, 
  onEndSession, 
  onSendMessage,
  onStartRecording, 
  onStopRecording, 
  onStartVideo,     // Video handlers
  onStopVideo,
  onStartScreenShare, // <-- New handler
  onStopScreenShare,  // <-- New handler
  onSetSelectedVideoDeviceId, // <-- New handler
  onGetVideoInputDevices, // <-- New handler
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  // Local state for temp system instruction edit within the popup
  const [tempSystemInstruction, setTempSystemInstruction] = useState(liveSystemInstruction);
  const [copiedCode, setCopiedCode] = useState(null);
  const [showCameraSelector, setShowCameraSelector] = useState(false);

  // Calculate isSessionActive here
  const isSessionActive = connectionStatus === 'connected' || connectionStatus === 'connecting';

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update local temp instruction if the main prop changes (e.g., popup reopens with different default)
  useEffect(() => {
    setTempSystemInstruction(liveSystemInstruction);
  }, [liveSystemInstruction]);

  // Fetch video devices when the popup opens or connection status changes (to re-fetch if needed)
  useEffect(() => {
    if (connectionStatus === 'connected' || !isSessionActive) { // Fetch if connected or if settings are visible
      onGetVideoInputDevices();
    }
  }, [onGetVideoInputDevices, connectionStatus, isSessionActive]);

  const handleSendMessage = () => {
    if (!inputText.trim() || connectionStatus !== 'connected') return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  // Apply the locally edited system instruction to the App state *before* starting
  const handleStartSession = () => {
    onSystemInstructionChange(tempSystemInstruction); // Update App state
    onStartSession(); // Call App's start function
  }

  // Handle overlay click to close
  const handleOverlayClick = (e) => {
     if (e.target === e.currentTarget) {
        onClose(); // Use the onClose from props which should handle session end
     }
  }
  
  const handleCopyCode = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 1200);
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

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-center items-center bg-black/40 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
    >
      <div
        className="w-full max-w-2xl h-full max-h-[90vh] sm:max-h-[80vh] bg-white/70 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden"
        style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-pink-500/10 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-full shadow">
              <MessageSquare className="h-6 w-6 text-indigo-500 dark:text-indigo-300" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Apsara Live</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
              connectionStatus === 'connected' ? 'bg-green-100 text-green-600' :
              connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-600' :
              connectionStatus === 'error' ? 'bg-red-100 text-red-600' :
              'bg-gray-100 text-gray-500'
            }`}>
              {getStatusIndicator(connectionStatus)}
            </span>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
              aria-label="Close live session"
            >
              <X className="h-6 w-6 transition-transform duration-150 ease-in-out group-hover:scale-110" />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-white/60 dark:bg-gray-900/60 backdrop-blur rounded-xl m-4 border border-gray-100 dark:border-gray-800 shadow-inner relative custom-scrollbar">
          {messages.length === 0 && !isSessionActive && (
            <div className="text-center text-gray-500 dark:text-gray-400 p-4">
              Configure settings below and click <b>Start Session</b>.
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`group flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'model' ? 'justify-start' : 'justify-center'} w-full`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl shadow-md transition-all duration-200
                  ${msg.role === 'user' ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white rounded-br-md' :
                    msg.role === 'model' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700' :
                    msg.role === 'system' ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 italic text-sm' :
                    msg.role === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700' :
                    'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'}
                  hover:shadow-lg`}
                style={{ minWidth: 80 }}
              >
                {/* Render message content, including code blocks with copy */}
                {Array.isArray(msg.parts) ? msg.parts.map((part, i) => {
                  if (part.text) {
                    return <div key={`part-text-${i}`} className="whitespace-pre-wrap leading-relaxed">{part.text}</div>;
                  } else if (part.inlineData?.mimeType?.startsWith('image/')) {
                    return (
                      <div key={`part-img-${i}`} className="my-2 flex justify-center">
                        <img
                          src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
                          alt="Generated content"
                          className="max-w-xs h-auto rounded-md border dark:border-gray-600 shadow"
                        />
                      </div>
                    );
                  } else if (part.executableCode) {
                    return (
                      <div key={`part-code-${i}`} className="my-2 bg-gray-900/90 rounded-lg overflow-hidden shadow border-l-4 border-indigo-400 relative">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 text-xs text-indigo-200 font-mono">
                          <span>{part.executableCode.language?.toUpperCase() || 'CODE'}</span>
                          <button
                            className="flex items-center gap-1 text-indigo-300 hover:text-white transition"
                            onClick={() => handleCopyCode(part.executableCode.code, msg.id + '-code-' + i)}
                            title="Copy code"
                          >
                            <ClipboardCopy className="w-4 h-4" />
                            {copiedCode === msg.id + '-code-' + i ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <pre className="p-4 overflow-x-auto text-xs text-indigo-100 font-mono bg-gray-900/80">
                          <code>{part.executableCode.code}</code>
                        </pre>
                      </div>
                    );
                  } else if (part.codeExecutionResult) {
                    const isError = part.codeExecutionResult.outcome !== 'OUTCOME_OK';
                    return (
                      <div key={`part-coderesult-${i}`} className={`my-2 rounded-lg overflow-hidden shadow border-l-4 ${isError ? 'border-red-400 bg-red-50 dark:bg-red-900/30' : 'border-green-400 bg-green-50 dark:bg-green-900/20'} relative`}>
                        <div className="flex items-center justify-between px-4 py-2 text-xs font-mono ${isError ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}">
                          <span>Output ({part.codeExecutionResult.outcome})</span>
                          <button
                            className="flex items-center gap-1 text-green-500 hover:text-green-700 dark:text-green-300 dark:hover:text-white transition"
                            onClick={() => handleCopyCode(part.codeExecutionResult.output, msg.id + '-output-' + i)}
                            title="Copy output"
                          >
                            <ClipboardCopy className="w-4 h-4" />
                            {copiedCode === msg.id + '-output-' + i ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <pre className="p-4 overflow-x-auto text-xs font-mono">
                          {part.codeExecutionResult.output}
                        </pre>
                      </div>
                    );
                  } else {
                    return null;
                  }
                }) : renderMessageContent(msg)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />

          {/* Audio Pulse Area */}
          {isModelSpeaking && (
            <div className="sticky bottom-0 left-0 right-0 flex justify-center items-center p-2 bg-gradient-to-t from-gray-50/80 dark:from-gray-900/60 via-white/60 dark:via-gray-900/40 to-transparent pointer-events-none">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full shadow">
                <div className="w-1.5 h-3 bg-blue-500 rounded-full animate-pulse-audio delay-75"></div>
                <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-pulse-audio delay-150"></div>
                <div className="w-1.5 h-3 bg-blue-500 rounded-full animate-pulse-audio delay-300"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400 ml-1.5">Speaking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Controls Area */}
        <div className="space-y-4 flex-shrink-0 px-6 pb-6">
          {audioError && (
            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-md text-center">
              Audio Error: {audioError}
            </div>
          )}

          {/* Settings Area (Shown when disconnected) */}
          {!isSessionActive && (
            <div className="p-6 border rounded-xl bg-white/80 dark:bg-gray-800/80 shadow space-y-4">
              <h3 className="text-base font-semibold text-center text-gray-700 dark:text-gray-200 mb-3">Live Session Settings</h3>
              {/* System Prompt */}
              <div>
                <label htmlFor="liveSystemInstruction" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  System Instruction (for Live session)
                </label>
                <textarea
                  id="liveSystemInstruction"
                  rows={2}
                  className="w-full p-2 border rounded-md text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-400"
                  value={tempSystemInstruction}
                  onChange={(e) => setTempSystemInstruction(e.target.value)}
                  placeholder="e.g., Respond concisely."
                />
              </div>
              {/* Modality */}
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Response Mode</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-1.5 cursor-pointer text-xs">
                    <input type="radio" name="liveModality" value="AUDIO" checked={liveModality === 'AUDIO'} onChange={() => onModalityChange('AUDIO')} className="text-indigo-600 focus:ring-indigo-500"/>
                    <span>Audio</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer text-xs">
                    <input type="radio" name="liveModality" value="TEXT" checked={liveModality === 'TEXT'} onChange={() => onModalityChange('TEXT')} className="text-indigo-600 focus:ring-indigo-500"/>
                    <span>Text</span>
                  </label>
                </div>
              </div>
              {/* Voice (Conditional) */}
              {liveModality === 'AUDIO' && (
                <div>
                  <label htmlFor="liveVoiceSelect" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    AI Voice
                  </label>
                  <select
                    id="liveVoiceSelect"
                    value={currentVoice}
                    onChange={(e) => onVoiceChange(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-400"
                  >
                    {voices.length > 0 ? voices.map(v => (<option key={v} value={v}>{v}</option>)) : <option disabled>Loading voices...</option>}
                  </select>
                </div>
              )}
              {/* Start Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleStartSession} 
                  disabled={connectionStatus === 'connecting'}
                  className="px-6 py-2 bg-gradient-to-r from-green-400 to-green-600 text-white text-base font-semibold rounded-lg shadow hover:from-green-500 hover:to-green-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {connectionStatus === 'connecting' ? 'Connecting...' : 'Start Session'}
                </button>
              </div>
            </div>
          )}

          {/* Input Area (Shown when connected) */}
          {connectionStatus === 'connected' && (
            <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 rounded-full shadow-lg px-4 py-2 mt-2">
              {/* Microphone Button */}
              <button
                onClick={() => {
                  if (isRecording) onStopRecording(); else onStartRecording();
                }}
                className={`p-2 rounded-full transition-colors group focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  isRecording
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 animate-pulse'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={isRecording ? 'Stop Recording' : 'Start Recording (Sends audio live)'}
              >
                {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5 transition-transform group-hover:scale-110" />}
              </button>
              {/* Video Button */}
              <button
                onClick={handleVideoToggle}
                disabled={isStreamingScreen}
                className={`p-2 rounded-full transition-colors group focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  isStreamingVideo
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/50 animate-pulse'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                } ${isStreamingScreen ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isStreamingVideo ? 'Stop Video Stream' : (isStreamingScreen ? 'Video disabled during screen share' : 'Start Video Stream')}
              >
                {isStreamingVideo ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5 transition-transform group-hover:scale-110" />}
              </button>
              {/* Screen Share Button */}
              <button
                onClick={() => {
                  if (isStreamingScreen) onStopScreenShare(); else onStartScreenShare();
                }}
                disabled={isStreamingVideo}
                className={`p-2 rounded-full transition-colors group focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  isStreamingScreen
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/50 animate-pulse'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                } ${isStreamingVideo ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isStreamingScreen ? 'Stop Screen Share' : (isStreamingVideo ? 'Screen share disabled during video' :'Start Screen Share')}
              >
                {isStreamingScreen ? <ScreenShareOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5 transition-transform group-hover:scale-110" />}
              </button>
              {/* Text Input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                  className="w-full p-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow"
                  placeholder="Type a message or use the mic..."
                  disabled={connectionStatus !== 'connected'}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={connectionStatus !== 'connected' || !inputText.trim()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors group"
                  title="Send Message"
                >
                  <Send className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
                </button>
              </div>
            </div>
          )}
          {/* End Session Button (Shown when active or error) */}
          {(isSessionActive || connectionStatus === 'error') && (
            <div className="flex justify-end">
              <button
                onClick={onEndSession}
                className="px-6 py-2 bg-gradient-to-r from-red-400 to-red-600 text-white text-base font-semibold rounded-lg shadow hover:from-red-500 hover:to-red-700 transition-colors"
              >
                End Session
              </button>
            </div>
          )}
        </div>

        {/* Camera Selector Modal */}
        {showCameraSelector && (
          <div 
            className="absolute inset-0 z-60 flex justify-center items-center bg-black/30 backdrop-blur-sm p-4"
            onClick={() => setShowCameraSelector(false)} // Close on overlay click
          >
            <div 
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-sm"
              onClick={e => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Select Camera Source</h3>
              {videoDevices.length > 0 ? (
                <ul className="space-y-2">
                  {videoDevices.map(device => (
                    <li key={device.deviceId}>
                      <button
                        onClick={() => handleCameraSelect(device.deviceId)}
                        className="w-full text-left px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      >
                        {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No camera devices found.</p>
              )}
              <button
                onClick={() => setShowCameraSelector(false)}
                className="mt-6 w-full px-4 py-2 rounded-md text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}