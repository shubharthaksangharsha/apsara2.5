import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Mic, MicOff } from 'lucide-react';

// Helper to render message content with potential icon
const renderMessageContent = (msg) => {
  if (msg.icon) {
    const IconComponent = msg.icon;
    const isSystem = msg.role === 'system';
    return (
      <span className={`flex items-center gap-1.5 ${isSystem ? 'opacity-80 italic' : ''}`}>
        <IconComponent className="h-4 w-4 inline-block opacity-70 flex-shrink-0" />
        <span>{msg.text}</span>
      </span>
    );
  }
  return msg.text;
}

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
  isRecording, 
  isModelSpeaking, 
  
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
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  // Local state for temp system instruction edit within the popup
  const [tempSystemInstruction, setTempSystemInstruction] = useState(liveSystemInstruction);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update local temp instruction if the main prop changes (e.g., popup reopens with different default)
  useEffect(() => {
    setTempSystemInstruction(liveSystemInstruction);
  }, [liveSystemInstruction]);

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

  const isSessionActive = connectionStatus === 'connected' || connectionStatus === 'connecting';
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4" 
      onClick={handleOverlayClick}
    >
      <div
        className="w-full max-w-2xl h-full max-h-[90vh] sm:max-h-[80vh] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-4 sm:p-6 rounded-lg shadow-xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
            Apsara Live
          </h2>
          <div className="text-sm font-medium">{getStatusIndicator(connectionStatus)}</div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            aria-label="Close live session"
          >
            <X className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
          </button>
        </div>
        
        {/* Message Display Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2 border rounded-md p-3 bg-gray-50 dark:bg-gray-900/50 custom-scrollbar relative">
          {messages.length === 0 && !isSessionActive && (
            <div className="text-center text-gray-500 dark:text-gray-400 p-4">
              Configure settings below and click "Start Session".
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm break-words ${
                  msg.role === 'user'
                    ? 'bg-indigo-500 text-white'
                    : msg.role === 'model'
                    ? 'bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600'
                    : msg.role === 'system'
                    ? 'bg-gray-100 dark:bg-gray-600 italic text-gray-600 dark:text-gray-300' // Adjusted system style
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' // Error role
                }`}
              >
                {renderMessageContent(msg)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} /> {/* Scroll target */}

          {/* Audio Pulse Area */}
          {isModelSpeaking && (
            <div className="sticky bottom-0 left-0 right-0 flex justify-center items-center p-2 bg-gradient-to-t from-gray-50 dark:from-gray-900/50 via-gray-50/80 dark:via-gray-900/40 to-transparent pointer-events-none">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow">
                <div className="w-1.5 h-3 bg-blue-500 rounded-full animate-pulse-audio delay-75"></div>
                <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-pulse-audio delay-150"></div>
                <div className="w-1.5 h-3 bg-blue-500 rounded-full animate-pulse-audio delay-300"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400 ml-1.5">Speaking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Controls Area */}
        <div className="space-y-4 flex-shrink-0">
          {audioError && (
            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-md text-center">
              Audio Error: {audioError}
            </div>
          )}

          {/* Settings Area (Shown when disconnected) */}
          {!isSessionActive && (
            <div className="p-4 border rounded-lg bg-gray-100 dark:bg-gray-700/50 space-y-4">
              <h3 className="text-sm font-semibold text-center text-gray-700 dark:text-gray-300 mb-3">Live Session Settings</h3>
              {/* System Prompt */}
              <div>
                <label htmlFor="liveSystemInstruction" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  System Instruction (for Live session)
                </label>
                <textarea
                  id="liveSystemInstruction"
                  rows={2}
                  className="w-full p-2 border rounded-md text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500"
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
                    className="w-full p-2 border rounded-md text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500"
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
                  className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {connectionStatus === 'connecting' ? 'Connecting...' : 'Start Session'}
                </button>
              </div>
            </div>
          )}

          {/* Input Area (Shown when connected) */}
          {connectionStatus === 'connected' && (
            <div className="flex items-center gap-2">
              {/* Microphone Button */}
              <button
                onClick={() => {
                  if (isRecording) onStopRecording(); else onStartRecording();
                }}
                className={`p-2 rounded-full transition-colors group ${
                  isRecording
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 animate-pulse'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={isRecording ? 'Stop Recording' : 'Start Recording (Sends audio live)'}
              >
                {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5 transition-transform group-hover:scale-110" />}
              </button>
              {/* Text Input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                  className="w-full p-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Type a message or use the mic..."
                  disabled={connectionStatus !== 'connected'}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={connectionStatus !== 'connected' || !inputText.trim()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors group"
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
                className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors"
              >
                End Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}