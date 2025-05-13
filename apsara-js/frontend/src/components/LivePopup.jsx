import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, ClipboardCopy, Settings as SettingsIcon, Paperclip, Info, MapPin, Code2, Terminal, CalendarDays, Users, Sun, ChevronDown, ChevronUp, Volume2 } from 'lucide-react';
import VideoStreamDisplay from './VideoStreamDisplay';
import ScreenShareDisplay from './ScreenShareDisplay';
import MapDisplay from './MapDisplay';

// Helper to render message content for CHAT tab specifically
const renderChatMessageContent = (msg) => {
  // Show user messages as is
  if (msg.role === 'user') {
    return <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>;
  }

  // Show model messages: ONLY TEXT parts
  if (msg.role === 'model' && Array.isArray(msg.parts)) {
    // Filter parts to ONLY include those with 'text' property
    const textParts = msg.parts.filter(part => part.text !== undefined && part.text !== null);

    if (textParts.length > 0) {
      return textParts.map((part, i) => (
        <div key={`${msg.id}-chat-text-part-${i}`} className="whitespace-pre-wrap leading-relaxed">
          {part.text}
        </div>
      ));
    } else {
      // If a model message has NO text parts (e.g., only an image was generated),
      // return null so nothing is rendered for that message in the chat tab.
      return null;
    }
  }

  // Show error messages
  if (msg.role === 'error') {
    return <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>;
  }

  // Show system messages ONLY if they have an icon (intended for chat display)
  if (msg.role === 'system' && msg.icon && msg.text) {
     const IconComponent = msg.icon;
     return (
      <span className={`flex items-center gap-1.5 opacity-80 italic`}>
        <IconComponent className="h-4 w-4 inline-block opacity-70 flex-shrink-0" />
        <span>{msg.text}</span>
      </span>
     );
  }

  // Ignore all other message types/roles in chat
  return null;
};

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
    }).filter(Boolean);
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

// Define tabs
const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'code', label: 'Code & Output', icon: Code2 },
  { id: 'map', label: 'Map', icon: MapPin },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, isPlaceholder: true },
  { id: 'meetings', label: 'Meetings', icon: Users, isPlaceholder: true },
  { id: 'weather', label: 'Weather', icon: Sun, isPlaceholder: true },
];

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
  mapDisplayData, // Assuming this is for the maps visualizer
  currentSessionHandle, // NEW PROP for session name/ID
  
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
  const [copiedContent, setCopiedContent] = useState(null);
  const [showCameraSelector, setShowCameraSelector] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [isSystemInstructionExpanded, setIsSystemInstructionExpanded] = useState(false);

  // Calculate isSessionActive here
  const isSessionActive = connectionStatus === 'connected' || connectionStatus === 'connecting';

  // Scroll to bottom when messages change
  useEffect(() => {
    if (activeTab === 'chat') {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

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

  // --- Log map data when it changes ---
  useEffect(() => {
    // This log fires whenever the mapDisplayData prop changes value
    console.log("[LivePopup] mapDisplayData prop updated in useEffect:", mapDisplayData);
  }, [mapDisplayData]);

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

  const logMessages = messages.filter(msg => {
    if (msg.role === 'system') {
      // Include specific system messages based on keywords or patterns
      const loggableKeywords = [
        'Preparing live session', 'Initiating connection', 'Browser-Backend WS connected',
        'Backend ready', 'Live AI connection active', 'Requesting video stream',
        'Webcam access granted', 'Video stream active', 'Video stream stopped',
        'Starting recording', 'Mic access granted', 'Recording active',
        'Using tool:', 'Tool getGoogleMapsRoute result:', // Specific tool example
        'Recording stopped.'
      ];
      return loggableKeywords.some(keyword => msg.text?.includes(keyword));
    }
    return false;
  });

  // Chat Tab Filter: Now relies more on renderChatMessageContent to filter parts
  const chatTabMessages = messages.filter(msg => {
    // Keep user, error, and icon'd system messages
    if (msg.role === 'user') return true;
    if (msg.role === 'error') return true;
    if (msg.role === 'system' && msg.icon) return true;
    // Include model messages, renderChatMessageContent will handle showing only text parts
    if (msg.role === 'model') return true;
    return false;
  });

  // Create combined & de-duplicated list for Code & Output Tab
  const combinedCodeOutputContent = [];
  const uniqueContentKeys = new Set();

  messages.forEach(msg => {
    if ((msg.role === 'model' && msg.parts) || msg.role === 'system_code_result') {
      // Handle Model parts
      msg.parts?.forEach((part, index) => {
        const partId = `${msg.id}-part-${index}`;
        let contentKey = null;
        let contentData = null;

        if (part.executableCode) {
          contentKey = `code-${part.executableCode.language}-${part.executableCode.code}`;
          contentData = { type: 'code', data: part.executableCode, id: partId };
        } else if (part.codeExecutionResult) {
          contentKey = `result-${part.codeExecutionResult.outcome}-${part.codeExecutionResult.output}`;
          contentData = { type: 'result', data: part.codeExecutionResult, id: partId };
        } else if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
          // Use a shorter key for images if data string is too long
          const imageDataSubstr = part.inlineData.data.substring(0, 100);
          contentKey = `image-${imageDataSubstr}`;
          contentData = { type: 'image', data: part.inlineData, id: partId };
        }

        if (contentKey && !uniqueContentKeys.has(contentKey)) {
          combinedCodeOutputContent.push(contentData);
          uniqueContentKeys.add(contentKey);
        }
      });

      // Handle legacy system_code_result
      if (msg.role === 'system_code_result' && msg.result) {
        const resultKey = `legacy-result-${msg.result.outcome}-${msg.result.output}`;
        const partId = `${msg.id}-legacyresult`;
         if (!uniqueContentKeys.has(resultKey)) {
           combinedCodeOutputContent.push({ type: 'result', data: msg.result, id: partId });
           uniqueContentKeys.add(resultKey);
         }
      }
    }
  });

  // Log data specifically when map tab is active during render
  if(activeTab === 'map') {
      console.log("[LivePopup] Rendering Map tab. Current mapDisplayData:", mapDisplayData);
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-center items-center bg-black/50 backdrop-blur-md"
      onClick={handleOverlayClick}
    >
      <div
        className="w-[95vw] h-[95vh] max-w-[1600px] max-h-[1000px] bg-white/80 dark:bg-gray-900/85 backdrop-blur-xl border border-gray-300 dark:border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="bg-indigo-100 dark:bg-indigo-900/40 p-1.5 rounded-full shadow">
              <MessageSquare className="h-5 w-5 text-indigo-500 dark:text-indigo-300" />
            </span>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Apsara Live</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${
              connectionStatus === 'connected' ? 'bg-green-100 text-green-700' :
              connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
              connectionStatus === 'error' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {getStatusIndicator(connectionStatus)}
            </span>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
              aria-label="Close live session"
            >
              <X className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden p-3 gap-3">
          {/* Left Panel (Logs) */}
          <div className="w-64 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0 hidden md:flex flex-col">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 border-b pb-1.5 dark:border-gray-600">Event Logs</h3>
            <div className="text-xs text-gray-600 dark:text-gray-400 flex-grow overflow-y-auto custom-scrollbar space-y-1 pr-1">
              {logMessages.length > 0 ? logMessages.map(msg => (
                <div key={msg.id + '-log'} className="p-1.5 rounded bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 text-[11px] leading-snug break-words">
                  {msg.text}
                </div>
              )) : <p className="text-center mt-4">No log events.</p>}
            </div>
          </div>

          {/* Center Panel (Tabs, Tab Content, Input) */}
          <div className="flex-1 flex flex-col bg-white/70 dark:bg-gray-800/70 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex-shrink-0 border-b border-gray-300 dark:border-gray-600 mb-2 custom-scrollbar overflow-x-auto">
              <nav className="flex space-x-1 -mb-px">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    disabled={tab.isPlaceholder && connectionStatus !== 'connected'}
                    className={`whitespace-nowrap flex items-center gap-1.5 py-2 px-3 border-b-2 font-medium text-xs
                      ${activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'}
                      ${(tab.isPlaceholder && connectionStatus !== 'connected') ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <tab.icon className="h-3.5 w-3.5" /> {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-3">
              {activeTab === 'chat' && (
                <div className="space-y-3">
                  {chatTabMessages.length === 0 && !isSessionActive && (
                    <div className="text-center text-gray-500 dark:text-gray-400 p-4 flex flex-col items-center justify-center h-full">
                       <Info size={32} className="mb-2 text-gray-400 dark:text-gray-500"/>
                      Configure settings in the right panel and click <b>Start Session</b>.
            </div>
          )}
                  {chatTabMessages.map((msg) => {
                     // renderChatMessageContent now handles filtering parts,
                     // but we need to check if it returned null (meaning no text parts)
                     const chatContent = renderChatMessageContent(msg);
                     if (!chatContent) return null; // Don't render the message container if no content

                    return (
                       <div key={msg.id + '-chat'} className={`group flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                         <div className={`max-w-[85%] px-3.5 py-1.5 rounded-xl shadow-md text-sm ${msg.role === 'user' ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white rounded-br-lg' : msg.role === 'model' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600' : msg.role === 'error' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-600' : 'bg-gray-100 dark:bg-gray-600/50 text-gray-600 dark:text-gray-300 italic text-xs'} hover:shadow-lg`} style={{ minWidth: 70 }}>
                           {chatContent}
                         </div>
                      </div>
                    );
                    }).filter(Boolean) /* Remove null entries */}
                  <div ref={messagesEndRef} />
                </div>
              )}
              {activeTab === 'code' && (
                <div className="space-y-2 p-1">
                  {combinedCodeOutputContent.length > 0 ? combinedCodeOutputContent.map(item => (
                    <div key={item.id}>
                      {item.type === 'code' && (
                        <div className="my-1.5 bg-gray-800/95 rounded-md overflow-hidden shadow border-l-2 border-indigo-400 relative text-xs">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-700/80 text-indigo-200 font-mono">
                            <span>{item.data.language?.toUpperCase() || 'CODE'}</span>
                            <button className="flex items-center gap-1 text-indigo-300 hover:text-white transition text-xs" onClick={() => handleCopyContent(item.data.code, item.id)} title="Copy code">
                              <ClipboardCopy className="w-3.5 h-3.5" /> {copiedContent === item.id ? 'Copied!' : 'Copy'}
                          </button>
                          </div>
                          <pre className="p-3.5 overflow-x-auto text-indigo-100 font-mono bg-gray-800/80 custom-scrollbar"><code>{item.data.code}</code></pre>
                        </div>
                      )}
                      {item.type === 'result' && (
                         (() => {
                           const isError = item.data.outcome !== 'OUTCOME_OK';
                           return (
                            <div className={`my-1.5 rounded-md overflow-hidden shadow border-l-2 ${isError ? 'border-red-400 bg-red-50 dark:bg-red-900/30' : 'border-green-400 bg-green-50 dark:bg-green-900/20'} relative text-xs`}>
                              <div className={`flex items-center justify-between px-3 py-1 font-mono ${isError ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                                <span><Terminal size={12} className="inline mr-1" />Output ({item.data.outcome})</span>
                                <button className={`flex items-center gap-1 text-xs ${isError ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} dark:hover:text-white transition`} onClick={() => handleCopyContent(item.data.output, item.id)} title="Copy output">
                                  <ClipboardCopy className="w-3 h-3" /> {copiedContent === item.id ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                              <pre className="p-3 overflow-x-auto font-mono custom-scrollbar">{item.data.output}</pre>
                      </div>
                    );
                         })()
                      )}
                      {item.type === 'image' && (
                        <div className="my-1.5 flex justify-center p-2 border rounded-md dark:border-gray-600 bg-gray-100 dark:bg-gray-700/30">
                           <img src={`data:${item.data.mimeType};base64,${item.data.data}`} alt="Generated image output" className="max-w-full h-auto rounded-md shadow"/>
                        </div>
                      )}
                    </div>
                  )) : <p className="text-gray-500 dark:text-gray-400 text-sm p-4 text-center">No code snippets or outputs from the model yet.</p>}
                </div>
              )}
              {activeTab === 'map' && (
                <div className="w-full h-full rounded-md overflow-hidden border-2 border-dashed border-red-500 dark:border-red-400 bg-red-100 dark:bg-red-900/20 flex flex-col">
                  <p className="flex-shrink-0 p-1 text-xs text-red-700 dark:text-red-200">Map Container Area</p>
                  <div className="flex-grow min-h-0 border-t border-red-400">
                    {mapDisplayData ? (
                      <>
                        <p className="flex-shrink-0 p-1 text-xs text-green-700 dark:text-green-200 bg-green-100 dark:bg-green-900/30"> MapDisplay component should render below:</p>
                        <div className="w-full h-full">
                          <MapDisplay key={JSON.stringify(mapDisplayData.bounds || mapDisplayData.center || Date.now())} mapData={mapDisplayData} />
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-sm p-4 text-center flex items-center justify-center h-full">Map data will appear here when available.</p>
                    )}
                      </div>
              </div>
              )}
              {TABS.find(t => t.id === activeTab)?.isPlaceholder && (
                <p className="text-gray-500 dark:text-gray-400 text-sm p-4 text-center">{TABS.find(t => t.id === activeTab)?.label} tab content (Placeholder).</p>
              )}
            </div>

            {/* Input Bar */}
            {connectionStatus === 'connected' && (
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/60 rounded-lg p-2 shadow-sm border-t dark:border-gray-600/50 mt-auto flex-shrink-0">
                <button
                  onClick={() => { if (isRecording) onStopRecording(); else onStartRecording(); }}
                  className={`p-2 rounded-lg transition-colors group focus:outline-none focus:ring-1 focus:ring-indigo-400 ${
                    isRecording ? 'bg-red-100 dark:bg-red-700/50 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-700/70 animate-pulse'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'}`}
                  title={isRecording ? 'Stop Recording' : 'Start Recording'}
                > {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />} </button>
                <button
                  onClick={handleVideoToggle}
                  disabled={isStreamingScreen}
                  className={`p-2 rounded-lg transition-colors group focus:outline-none focus:ring-1 focus:ring-indigo-400 ${
                    isStreamingVideo ? 'bg-blue-100 dark:bg-blue-700/50 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/70 animate-pulse'
                                   : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'}
                                   ${isStreamingScreen ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={isStreamingVideo ? 'Stop Video' : (isStreamingScreen ? 'Video disabled' : 'Start Video')}
                > {isStreamingVideo ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />} </button>
                <button
                  onClick={() => { if (isStreamingScreen) onStopScreenShare(); else onStartScreenShare(); }}
                  disabled={isStreamingVideo}
                  className={`p-2 rounded-lg transition-colors group focus:outline-none focus:ring-1 focus:ring-indigo-400 ${
                    isStreamingScreen ? 'bg-green-100 dark:bg-green-700/50 text-green-600 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700/70 animate-pulse'
                                     : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'}
                                     ${isStreamingVideo ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={isStreamingScreen ? 'Stop Screen Share' : (isStreamingVideo ? 'Screen share disabled' : 'Start Screen Share')}
                > {isStreamingScreen ? <ScreenShareOff className="h-4 w-4" /> : <ScreenShare className="h-4 w-4" />} </button>
                
                <div className="relative flex-1">
                  <input
                    type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                    className="w-full p-2.5 pl-10 pr-10 border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    placeholder="Type a message..." disabled={connectionStatus !== 'connected'}
                  />
                  <button title="Attach file" className="absolute left-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400">
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleSendMessage} disabled={connectionStatus !== 'connected' || !inputText.trim()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-white bg-indigo-500 rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send Message"
                  > <Send className="h-4 w-4" /> </button>
                </div>
              </div>
            )}
            {audioError && (
              <div className="p-1.5 mt-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs rounded-md text-center">
                Audio Error: {audioError}
            </div>
          )}
        </div>

          {/* Right Settings Panel */}
          <div className={`w-72 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col text-sm`}>
            <h3 className="text-base font-semibold text-center text-gray-700 dark:text-gray-200 mb-2 border-b dark:border-gray-600 pb-2 flex-shrink-0">
              {isSessionActive ? "Session Active" : "Live Session Settings"}
            </h3>
            
            {!isSessionActive ? (
              <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 flex-grow">
              <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="liveSystemInstruction" className="block text-xs font-medium text-gray-600 dark:text-gray-400">System Instruction</label>
                    <button onClick={() => setIsSystemInstructionExpanded(!isSystemInstructionExpanded)} className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 flex items-center gap-1">
                      {isSystemInstructionExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} {isSystemInstructionExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                  {isSystemInstructionExpanded ? (
                <textarea
                      id="liveSystemInstruction" rows={5} 
                      className="w-full p-2 border rounded-md text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-400 custom-scrollbar"
                      value={tempSystemInstruction} onChange={(e) => setTempSystemInstruction(e.target.value)} placeholder="e.g., Respond concisely."
                />
                  ) : (
                    <div className="p-2 border rounded-md text-xs bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 truncate cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => setIsSystemInstructionExpanded(true)}>
                      {tempSystemInstruction || "Default instructions"}
              </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Response Mode</label>
                  <div className="space-y-1">
                    {[
                      { value: 'AUDIO', label: 'Audio Only' },
                      { value: 'AUDIO_TEXT', label: 'Audio + Text' },
                      { value: 'TEXT', label: 'Text Only' },
                    ].map(opt => (
                      <label key={opt.value} className="flex items-center space-x-2 cursor-pointer text-xs p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <input type="radio" name="liveModality" value={opt.value} checked={liveModality === opt.value} onChange={() => onModalityChange(opt.value)} className="text-indigo-600 focus:ring-indigo-500 h-3 w-3"/>
                        <span>{opt.label}</span>
                  </label>
                    ))}
                  </div>
                </div>
                {(liveModality === 'AUDIO' || liveModality === 'AUDIO_TEXT') && (
                  <div>
                    <label htmlFor="liveVoiceSelect" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">AI Voice</label>
                  <select
                      id="liveVoiceSelect" value={currentVoice} onChange={(e) => onVoiceChange(e.target.value)}
                      className="w-full p-2 border rounded-md text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-400"
                  >
                    {voices.length > 0 ? voices.map(v => (<option key={v} value={v}>{v}</option>)) : <option disabled>Loading voices...</option>}
                  </select>
                </div>
              )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Advanced Settings</label>
                  <div className="p-2 border rounded-md text-xs bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"> Placeholder for advanced settings. </div>
                </div>
                <div className="pt-2 flex-grow flex items-end">
                <button
                    onClick={handleStartSession} disabled={connectionStatus === 'connecting'}
                    className="w-full px-4 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-lg shadow hover:bg-green-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                  {connectionStatus === 'connecting' ? 'Connecting...' : 'Start Session'}
                </button>
              </div>
            </div>
            ) : (
              <div className="flex flex-col flex-grow">
                <div className="text-xs text-gray-600 dark:text-gray-300 mb-2 space-y-0.5 flex-shrink-0">
                  <p><strong>Status:</strong> {getStatusIndicator(connectionStatus)}</p>
                  {liveModality && <p><strong>Mode:</strong> {liveModality.replace('_', ' + ')}</p>}
                  {(liveModality === 'AUDIO' || liveModality === 'AUDIO_TEXT') && currentVoice && <p><strong>Voice:</strong> {currentVoice}</p>}
                  {currentSessionHandle && <p><strong>Session ID:</strong> <span className="font-mono text-indigo-600 dark:text-indigo-400">{currentSessionHandle.slice(0,12)}...</span></p>}
                  {!currentSessionHandle && <p><strong>Session ID:</strong> N/A</p>}
                </div>

                {/* Media Area - Fixed Height Placeholder & Actual Streams */}
                <div className="flex-grow space-y-2 my-2 overflow-hidden flex flex-col"> 
                  {/* Video Stream Area */}
                  <div className="w-full aspect-video bg-gray-200 dark:bg-gray-700/50 rounded border dark:border-gray-600/50 flex items-center justify-center overflow-hidden min-h-[9rem] max-h-36"> 
                    {isStreamingVideo && mediaStream ? (
                      <VideoStreamDisplay videoStream={mediaStream} isWebcamActive={isStreamingVideo} /> 
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">Your Camera</span>
                    )}
                  </div>
                  {/* Screen Share Area */}
                   <div className="w-full aspect-video bg-gray-200 dark:bg-gray-700/50 rounded border dark:border-gray-600/50 flex items-center justify-center overflow-hidden min-h-[9rem] max-h-36"> 
                    {isStreamingScreen && screenStream ? (
                      <ScreenShareDisplay screenStream={screenStream} isScreenSharingActive={isStreamingScreen} /> 
                    ) : (
                       <span className="text-xs text-gray-400 dark:text-gray-500">Screen Share</span>
                    )}
                  </div>

                  {/* Audio Visualizer - Below media placeholders/streams */}
                  <div className="h-8 flex items-center justify-center mt-2 flex-shrink-0">
                    {(isModelSpeaking && (liveModality === 'AUDIO' || liveModality === 'AUDIO_TEXT')) && (
                       <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700/80 backdrop-blur-sm rounded-full shadow-inner">
                         <Volume2 className="h-3 w-3 text-blue-500 animate-pulse"/>
                         <div className="w-1 h-2.5 bg-blue-500 rounded-full animate-pulse-audio delay-75"></div>
                         <div className="w-1 h-3.5 bg-blue-500 rounded-full animate-pulse-audio delay-150"></div>
                         <div className="w-1 h-2.5 bg-blue-500 rounded-full animate-pulse-audio delay-300"></div>
                         <span className="text-[10px] text-gray-600 dark:text-gray-300 ml-1">Speaking</span>
            </div>
          )}
                  </div>
                </div>
                
                <div className="mt-auto flex-shrink-0"> {/* End Session Button */}
                  <button onClick={onEndSession} className="w-full px-4 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-lg shadow hover:bg-red-600 transition-colors"> End Session </button>
                </div>
              </div>
            )}
              </div>
            </div>

        {/* Camera Selector Modal */}
        {showCameraSelector && (
          <div 
            className="absolute inset-0 z-60 flex justify-center items-center bg-black/30 backdrop-blur-sm p-4"
            onClick={() => setShowCameraSelector(false)}
          >
            <div 
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-sm"
              onClick={e => e.stopPropagation()}
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