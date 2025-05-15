import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, ClipboardCopy, Settings as SettingsIcon, Paperclip, Info, MapPin, Code2, Terminal, CalendarDays, Users, Sun, ChevronDown, ChevronUp, Volume2, RefreshCw, PlusCircle, Calendar as CalendarIcon, Clock, AudioLines, Save, FolderOpen, Play } from 'lucide-react';
import VideoStreamDisplay from './VideoStreamDisplay';
import ScreenShareDisplay from './ScreenShareDisplay';
import MapDisplay from './MapDisplay';
import SavedSessionsPanel from './SavedSessionsPanel';
import { saveSession } from '../utils/liveSessionStorage';

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
      <div className="my-1 p-2 bg-gray-100 dark:bg-gray-900/50 rounded-md overflow-x-auto custom-scrollbar text-xs mb-1">
        <span className="text-gray-500 dark:text-gray-400 block text-xs">Executable Code ({msg.code.language || 'PYTHON'}):</span>
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
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'weather', label: 'Weather', icon: Sun },
];

// Add the media resolution options as a constant
const MEDIA_RESOLUTIONS = [
  { value: 'MEDIA_RESOLUTION_LOW', label: 'Low' },
  { value: 'MEDIA_RESOLUTION_MEDIUM', label: 'Medium' },
  { value: 'MEDIA_RESOLUTION_HIGH', label: 'High' },
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
  weatherUIData, // <-- NEW PROP for weather data
  currentSessionHandle, // NEW PROP for session name/ID
  calendarEvents, // <-- NEW PROP for calendar events
  calendarEventsLastUpdated, // <-- NEW PROP
  transcriptionEnabled, // <-- NEW PROP for audio transcription
  slidingWindowEnabled, // <-- NEW PROP for context compression
  slidingWindowTokens, // <-- NEW PROP for token limit
  activeTab, // NEW: prop for active tab from useLiveSession
  setActiveTab, // NEW: function to set active tab in useLiveSession
  
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
  flipCamera,
  setTranscriptionEnabled,
  setSlidingWindowEnabled,
  setSlidingWindowTokens,
  onAutoResumeSession,
  onLoadSession,
  onStartWithMainContext, // NEW: Handler for starting with main chat context
  startedWithMainContext = false, // NEW: Flag to indicate if started with main context
  setSessionResumeHandle, // NEW: Added to handle session resume
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  // Local state for temp system instruction edit within the popup
  const [tempSystemInstruction, setTempSystemInstruction] = useState(liveSystemInstruction);
  const [copiedContent, setCopiedContent] = useState(null);
  const [showCameraSelector, setShowCameraSelector] = useState(false);
  const [isSystemInstructionExpanded, setIsSystemInstructionExpanded] = useState(false);
  const prevCalendarEventsLastUpdatedRef = useRef(0); // Keep track of the previous update value

  // New state for saved sessions
  const [showSavedSessions, setShowSavedSessions] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // --- NEW: State for Create Event Modal & Form ---
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [newEventForm, setNewEventForm] = useState({
    summary: '',
    startDateTime: '', // Expect ISO 8601 format e.g., "2024-08-15T10:00:00-07:00"
    endDateTime: '',   // Expect ISO 8601 format
    description: '',
    location: '',
    attendees: '', // Comma-separated emails
  });
  // --- END NEW ---

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

  // Keep track of code content length for potential future use
  const prevCodeContentLengthRef = useRef(0);
  
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
          // Include message ID to make each code execution unique even with identical code
          contentKey = `code-${msg.id}-${part.executableCode.language}-${part.executableCode.code}`;
          contentData = { type: 'code', data: part.executableCode, id: partId };
          console.log("[LivePopup] Executable code detected:", part.executableCode.language);
        } else if (part.codeExecutionResult) {
          // Include message ID to make each result unique
          contentKey = `result-${msg.id}-${part.codeExecutionResult.outcome}-${part.codeExecutionResult.output}`;
          contentData = { type: 'result', data: part.codeExecutionResult, id: partId };
          console.log("[LivePopup] Code execution result detected:", part.codeExecutionResult.outcome);
        } else if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
          // Use a shorter key for images if data string is too long
          const imageDataSubstr = part.inlineData.data.substring(0, 100);
          // Include message ID for images as well
          contentKey = `image-${msg.id}-${imageDataSubstr}`;
          contentData = { type: 'image', data: part.inlineData, id: partId };
        }

        if (contentKey && !uniqueContentKeys.has(contentKey)) {
          combinedCodeOutputContent.push(contentData);
          uniqueContentKeys.add(contentKey);
        }
      });

      // Handle legacy system_code_result
      if (msg.role === 'system_code_result' && msg.result) {
        const resultKey = `legacy-result-${msg.id}-${msg.result.outcome}-${msg.result.output}`;
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
  // --- NEW: Log data when weather tab is active during render ---
  if(activeTab === 'weather') {
    console.log("[LivePopup] Rendering Weather tab. Current weatherUIData:", weatherUIData);
  }
  // --- END NEW ---

  const handleSendMessage = () => {
    if (!inputText.trim() || connectionStatus !== 'connected') return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  // Apply the locally edited system instruction to the App state *before* starting
  const handleStartSession = () => {
    onSystemInstructionChange(tempSystemInstruction); // Update App state
    
    // Clear any existing session handle to ensure we always start a new session
    if (setSessionResumeHandle) {
      setSessionResumeHandle(null);
    }
    
    // Call App's start function without any context to start a fresh session
    onStartSession(); 
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

  // NEW: Function to save the current session
  const handleSaveCurrentSession = () => {
    // Only allow saving if we have a current session and a handle
    if (isSessionActive && currentSessionHandle) {
      setShowSaveDialog(true);
    } else {
      alert("No active session to save");
    }
  };

  // NEW: Function to actually save the session to localStorage
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

  // NEW: Function to handle selecting a saved session
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

  const handleRefreshCalendar = () => {
    if (connectionStatus === 'connected') {
      onSendMessage("list my upcoming calendar events");
    }
  };

  // --- NEW: Handler for input changes in the create event form ---
  const handleNewEventFormChange = (e) => {
    const { name, value } = e.target;
    setNewEventForm(prev => ({ ...prev, [name]: value }));
  };
  // --- END NEW ---

  // --- NEW: Handler for submitting the create event form ---
  const handleCreateEventSubmit = () => {
    if (connectionStatus !== 'connected') return;
    if (!newEventForm.summary.trim() || !newEventForm.startDateTime.trim() || !newEventForm.endDateTime.trim()) {
      alert("Please fill in Summary, Start Date/Time, and End Date/Time."); // Basic validation
      return;
    }

    // Construct a detailed message for the AI
    // The AI will map this to the createCalendarEvent tool and its parameters
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
    setNewEventForm({ summary: '', startDateTime: '', endDateTime: '', description: '', location: '', attendees: '' });
  };
  // --- END NEW ---

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
        <div className="flex justify-between items-center px-3 sm:px-5 py-2.5 sm:py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-md text-sm font-medium text-blue-600 dark:text-blue-300">
              <AudioLines className="h-4 w-4 mr-1.5" />
              <span>Apsara Live</span>
            </div>
            {getStatusIndicator(connectionStatus)}
          </div>

          <div className="flex items-center gap-2">
            {/* Keep only the Close button */}
            <button 
              onClick={onClose} 
              className="flex items-center text-xs rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area - Improve overall layout for mobile */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden p-1.5 sm:p-3 gap-1.5 sm:gap-3">
          {/* Left Panel (Logs) - Hidden on mobile */}
          <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-800/50 p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0 hidden md:flex flex-col">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 border-b pb-1.5 dark:border-gray-600">Event Logs</h3>
            <div className="text-xs text-gray-600 dark:text-gray-400 flex-grow overflow-y-auto custom-scrollbar space-y-1 pr-1">
              {logMessages.length > 0 ? logMessages.map(msg => (
                <div key={msg.id + '-log'} className="p-1.5 rounded bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 text-[11px] leading-snug break-words">
                  {msg.text}
                </div>
              )) : <p className="text-center mt-4">No log events.</p>}
            </div>
          </div>

          {/* Center Panel - More compact padding for mobile */}
          <div className="flex-1 flex flex-col bg-white/70 dark:bg-gray-800/70 p-1.5 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Tab Navigation - Smaller text and padding on mobile */}
            <div className="flex-shrink-0 border-b border-gray-300 dark:border-gray-600 mb-1.5 sm:mb-2 overflow-x-auto custom-scrollbar">
              <nav className="flex space-x-1 -mb-px whitespace-nowrap">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    disabled={tab.isPlaceholder && connectionStatus !== 'connected'}
                    className={`whitespace-nowrap flex items-center gap-1 py-1 px-1.5 sm:py-2 sm:px-3 border-b-2 font-medium text-[9px] sm:text-xs
                      ${activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'}
                      ${(tab.isPlaceholder && connectionStatus !== 'connected') ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <tab.icon className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" /> {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content - More vertical space for content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mb-1.5 sm:mb-3">
              {activeTab === 'chat' && (
                <div className="space-y-2.5 sm:space-y-3">
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
                <div className="space-y-1.5 p-0.5 sm:p-1">
                  {combinedCodeOutputContent.length > 0 ? combinedCodeOutputContent.map(item => (
                    <div key={item.id}>
                      {item.type === 'code' && (
                        <div className="my-1 bg-gray-800/95 rounded-md overflow-hidden shadow border-l-2 border-indigo-400 relative text-[10px] sm:text-xs">
                          <div className="flex items-center justify-between px-2 py-1 sm:px-3 sm:py-1.5 bg-gray-700/80 text-indigo-200 font-mono">
                            <span>{item.data.language?.toUpperCase() || 'CODE'}</span>
                            <button className="flex items-center gap-1 text-indigo-300 hover:text-white transition text-[10px] sm:text-xs" onClick={() => handleCopyContent(item.data.code, item.id)} title="Copy code">
                              <ClipboardCopy className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {copiedContent === item.id ? 'Copied!' : 'Copy'}
                          </button>
                          </div>
                          <pre className="p-2 sm:p-3.5 overflow-x-auto text-indigo-100 font-mono bg-gray-800/80 custom-scrollbar text-[10px] sm:text-xs"><code>{item.data.code}</code></pre>
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
                  )) : <p className="text-gray-500 dark:text-gray-400 text-xs p-3 text-center">No code snippets or outputs from the model yet.</p>}
                </div>
              )}
              {activeTab === 'map' && (
                <div className="w-full h-full rounded-md overflow-hidden border-2 border-dashed border-red-500 dark:border-red-400 bg-red-100 dark:bg-red-900/20 flex flex-col">
                  <p className="flex-shrink-0 p-1 text-xs text-red-700 dark:text-red-200">Map Container Area</p>
                  <div className="flex-grow min-h-[200px] sm:min-h-0 border-t border-red-400"> {/* Min height for mobile visibility */}
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
              {activeTab === 'weather' && (
                <div className="p-2 sm:p-4 space-y-3 text-gray-800 dark:text-gray-200">
                  {weatherUIData && Object.keys(weatherUIData).length > 0 ? (
                    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-center justify-between mb-3 sm:mb-4">
                        <div className="text-center sm:text-left">
                          <h2 className="text-xl sm:text-2xl font-bold">{weatherUIData.city}, {weatherUIData.country}</h2>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{weatherUIData.condition_description}</p>
                        </div>
                        {weatherUIData.icon && (
                          <img 
                            src={`https://openweathermap.org/img/wn/${weatherUIData.icon}@2x.png`} 
                            alt={weatherUIData.condition_description}
                            className="w-12 h-12 sm:w-16 sm:h-16 mt-2 sm:mt-0"
                          />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm">
                        <div>
                          <p className="font-semibold text-base sm:text-lg">{weatherUIData.temp_numeric?.toFixed(1)}{weatherUIData.temp_unit_char}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Temperature</p>
                        </div>
                        <div>
                          <p className="font-semibold text-base sm:text-lg">{weatherUIData.humidity_percent}%</p>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Humidity</p>
                        </div>
                        <div>
                          <p className="font-semibold text-base sm:text-lg">{weatherUIData.wind_speed_numeric?.toFixed(1)} {weatherUIData.wind_speed_unit_text}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Wind</p>
                        </div>
                        {/* Add more details as desired */}
                      </div>
                       <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 text-center">Weather data from OpenWeatherMap</p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 p-6 flex flex-col items-center justify-center h-full bg-white dark:bg-gray-800 rounded-lg shadow">
                       <Sun size={40} className="mb-3 text-gray-400 dark:text-gray-500"/>
                      <p className="font-semibold mb-1">Weather Information</p>
                      <p className="text-xs">Ask Apsara about the weather for a specific city to see details here.</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'calendar' && (
                <div className="p-2 sm:p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-1.5 sm:gap-2">
                        <CalendarIcon size={20} sm:size={24} className="text-indigo-500 dark:text-indigo-400"/>
                        Calendar Events
                    </h2>
                    <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => setIsCreateEventModalOpen(true)}
                          disabled={connectionStatus !== 'connected'}
                          className="flex-1 sm:flex-auto items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-green-500 text-white text-[11px] sm:text-xs font-medium rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 flex"
                        >
                          <PlusCircle size={12} sm:size={14} />
                          Create Event
                        </button>
                        <button
                          onClick={handleRefreshCalendar}
                          disabled={connectionStatus !== 'connected'}
                          className="flex-1 sm:flex-auto items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-indigo-500 text-white text-[11px] sm:text-xs font-medium rounded-md hover:bg-indigo-600 transition-colors disabled:opacity-50 flex"
                        >
                          <RefreshCw size={12} sm:size={14} />
                          Refresh
                        </button>
                    </div>
                  </div>

                  {connectionStatus !== 'connected' && (
                     <div className="text-center text-gray-500 dark:text-gray-400 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <CalendarDays size={32} sm:size={40} className="mb-2 sm:mb-3 text-gray-400 dark:text-gray-500 mx-auto"/>
                        <p className="font-semibold mb-1 text-sm sm:text-base">Calendar Disconnected</p>
                        <p className="text-xs sm:text-sm">Start a session to load and manage calendar events.</p>
                      </div>
                  )}

                  {connectionStatus === 'connected' && calendarEvents.length > 0 && (
                    <ul className="space-y-1.5 sm:space-y-2">
                      {calendarEvents.map(event => (
                        <li key={event.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
                          <h3 className="font-semibold text-indigo-700 dark:text-indigo-300">{event.summary}</h3>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                            {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}
                          </p>
                          {event.location && <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Location: {event.location}</p>}
                          {event.description && <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">{event.description}</p>}
                           {event.link && <a href={event.link} target="_blank" rel="noopener noreferrer" className="text-[10px] sm:text-xs text-blue-500 hover:underline dark:text-blue-400 mt-1 block">View on Google Calendar</a>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {connectionStatus === 'connected' && calendarEvents.length === 0 && (
                    <div className="text-center text-gray-500 dark:text-gray-400 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                      <CalendarDays size={40} className="mb-3 text-gray-400 dark:text-gray-500 mx-auto"/>
                      <p className="font-semibold mb-1">No Events Found</p>
                      <p className="text-xs">Click "Refresh Events" to load your upcoming calendar entries, or there might be no events in the default range.</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'meetings' && (
                <div className="text-center text-gray-500 dark:text-gray-400 p-4 text-center">Meetings tab content (Placeholder).</div>
              )}
              {TABS.find(t => t.id === activeTab)?.isPlaceholder && activeTab !== 'calendar' && activeTab !== 'weather' && (
                <p className="text-gray-500 dark:text-gray-400 text-sm p-4 text-center">{TABS.find(t => t.id === activeTab)?.label} tab content (Placeholder).</p>
              )}
            </div>

            {/* Input Bar - Improved for mobile */}
            {connectionStatus === 'connected' && (
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
                    type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                    className="w-full p-2 pl-8 pr-8 border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    placeholder="Type a message..." disabled={connectionStatus !== 'connected'}
                  />
                  <button title="Attach file" className="absolute left-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 dark:text-gray-300">
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleSendMessage} disabled={connectionStatus !== 'connected' || !inputText.trim()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-white bg-indigo-500 rounded-md hover:bg-indigo-600 disabled:opacity-50"
                    aria-label="Send Message"
                  > 
                    <Send className="h-4 w-4" /> 
                  </button>
                </div>
              </div>
            )}
            {audioError && (
              <div className="p-1.5 mt-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs rounded-md text-center">
                Audio Error: {audioError}
            </div>
          )}
        </div>

        {/* Right Settings Panel - Collapsible on mobile */}
        <div className={`w-full md:w-72 bg-gray-50 dark:bg-gray-800/50 p-2 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col text-xs mt-1.5 md:mt-0 max-h-[35vh] md:max-h-none overflow-y-auto md:overflow-visible`}>
          <h3 className="text-sm md:text-base font-semibold text-center text-gray-700 dark:text-gray-200 mb-2 border-b dark:border-gray-600 pb-2 flex-shrink-0">
            {isSessionActive ? "Session Active" : "Live Session Settings"}
          </h3>
          
          {!isSessionActive ? (
            <div className="space-y-2 sm:space-y-3 overflow-y-auto custom-scrollbar pr-1 flex-grow">
              <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="liveSystemInstruction" className="block text-xs font-medium text-gray-600 dark:text-gray-400">System Instruction</label>
                    <button onClick={() => setIsSystemInstructionExpanded(!isSystemInstructionExpanded)} className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 flex items-center gap-1">
                      {isSystemInstructionExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} {isSystemInstructionExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                  {isSystemInstructionExpanded ? (
                <textarea
                      id="liveSystemInstruction" rows={window.innerWidth < 768 ? 3 : 5} // Shorter on mobile
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
                      <label key={opt.value} className="flex items-center space-x-2 cursor-pointer text-xs p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded sm:p-1.5">
                        <input type="radio" name="liveModality" value={opt.value} checked={liveModality === opt.value} onChange={() => onModalityChange(opt.value)} className="text-indigo-600 focus:ring-indigo-500 h-3 w-3 sm:h-3.5 sm:w-3.5"/>
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
                      className="w-full p-1.5 sm:p-2 border rounded-md text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-400"
                  >
                    {voices.length > 0 ? voices.map(v => (<option key={v} value={v}>{v}</option>)) : <option disabled>Loading voices...</option>}
                  </select>
                </div>
              )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Advanced Settings</label>
                  <div className="space-y-2 p-2 border rounded-md text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"> 
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">Media Resolution</label>
                      <select className="w-full p-1 border rounded-md text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-400">
                        {MEDIA_RESOLUTIONS.map(res => (
                          <option key={res.value} value={res.value}>{res.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <input type="checkbox" id="transcriptionEnabled" className="h-3 w-3 text-indigo-600 focus:ring-indigo-500" checked={transcriptionEnabled} onChange={e => setTranscriptionEnabled(e.target.checked)} />
                      <label htmlFor="transcriptionEnabled" className="text-xs text-gray-700 dark:text-gray-300">Enable Transcription</label>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input type="checkbox" id="slidingWindowEnabled" className="h-3 w-3 text-indigo-600 focus:ring-indigo-500" checked={slidingWindowEnabled} onChange={e => setSlidingWindowEnabled(e.target.checked)} />
                      <label htmlFor="slidingWindowEnabled" className="text-xs text-gray-700 dark:text-gray-300">Enable Sliding Window Compression</label>
                      {slidingWindowEnabled && (
                        <input type="number" min="1000" max="16000" step="100" value={slidingWindowTokens} onChange={e => setSlidingWindowTokens(Number(e.target.value))} className="ml-2 w-16 p-1 border rounded text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                      )}
                      {slidingWindowEnabled && <span className="text-xs text-gray-500 ml-1">Trigger Tokens</span>}
                    </div>
                  </div>
                </div>
                
                {/* NEW: Load Session Button */}
                <div className="pt-2 flex flex-col gap-2">
                <button
                    onClick={() => setShowSavedSessions(true)}
                    className="w-full px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg shadow hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5" /> Load Saved Session
                  </button>
                  
                  <button
                    onClick={handleStartSession} disabled={connectionStatus === 'connecting'}
                    className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-green-500 text-white text-sm font-semibold rounded-lg shadow hover:bg-green-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
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
                  
                  {/* Add Session Time Display */}
                  {sessionTimeLeft && (
                    <p className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 mt-1">
                      <Clock size={10} /> Session time remaining: {sessionTimeLeft}
                    </p>
                  )}
                </div>

                {/* Media Area - Mobile-optimized with horizontal layout */}
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
                    <button onClick={onEndSession} className="w-full px-3 py-1.5 sm:py-2.5 bg-red-500 text-white text-xs font-semibold rounded-lg shadow hover:bg-red-600 transition-colors">
                      End Session
              </button>
                  </div>
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
              className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl w-full max-w-xs sm:max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 sm:mb-4">Select Camera Source</h3>
              {videoDevices.length > 0 ? (
                <ul className="space-y-1.5 sm:space-y-2">
                  {videoDevices.map(device => (
                    <li key={device.deviceId}>
              <button
                        onClick={() => handleCameraSelect(device.deviceId)}
                        className="w-full text-left px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      >
                        {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
              </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No camera devices found.</p>
              )}
              <button
                onClick={() => setShowCameraSelector(false)}
                className="mt-4 sm:mt-6 w-full px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                Cancel
              </button>
              </div>
            </div>
          )}

        {/* NEW: Save Session Dialog */}
        {showSaveDialog && (
          <div 
            className="absolute inset-0 z-60 flex justify-center items-center bg-black/30 backdrop-blur-sm p-4"
            onClick={() => setShowSaveDialog(false)}
          >
            <div 
              className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl w-full max-w-xs sm:max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 sm:mb-4">Save Current Session</h3>
              <div className="mb-4">
                <label htmlFor="sessionTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Session Title
                </label>
                <input
                  type="text"
                  id="sessionTitle"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="My Chat Session"
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCurrentSession}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NEW: Saved Sessions Panel */}
        {showSavedSessions && (
          <SavedSessionsPanel
            onClose={() => setShowSavedSessions(false)}
            onSelectSession={handleSelectSavedSession}
          />
        )}

        {/* Create Event Modal */}
        {isCreateEventModalOpen && (
          <div 
            className="absolute inset-0 z-[65] flex justify-center items-center bg-black/40 backdrop-blur-sm p-3 sm:p-4"
            onClick={() => setIsCreateEventModalOpen(false)}
          >
            <div 
              className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl w-full max-w-xs sm:max-w-lg overflow-y-auto max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 sm:mb-5">Create New Calendar Event</h3>
              <form onSubmit={(e) => { e.preventDefault(); handleCreateEventSubmit(); }} className="space-y-3 sm:space-y-4 text-xs sm:text-sm">
                <div>
                  <label htmlFor="eventSummary" className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Summary*</label>
                  <input
                    type="text"
                    name="summary"
                    id="eventSummary"
                    value={newEventForm.summary}
                    onChange={handleNewEventFormChange}
                    required
                    className="w-full p-1.5 sm:p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label htmlFor="eventStartDateTime" className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Start Date & Time*</label>
                    <input
                      type="datetime-local"
                      name="startDateTime"
                      id="eventStartDateTime"
                      value={newEventForm.startDateTime}
                      onChange={handleNewEventFormChange}
                      required
                      className="w-full p-1.5 sm:p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="eventEndDateTime" className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">End Date & Time*</label>
                    <input
                      type="datetime-local"
                      name="endDateTime"
                      id="eventEndDateTime"
                      value={newEventForm.endDateTime}
                      onChange={handleNewEventFormChange}
                      required
                      className="w-full p-1.5 sm:p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="eventDescription" className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Description</label>
                  <textarea
                    name="description"
                    id="eventDescription"
                    rows="2" // Shorter on mobile
                    value={newEventForm.description}
                    onChange={handleNewEventFormChange}
                    className="w-full p-1.5 sm:p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 custom-scrollbar text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="eventLocation" className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Location</label>
                  <input
                    type="text"
                    name="location"
                    id="eventLocation"
                    value={newEventForm.location}
                    onChange={handleNewEventFormChange}
                    className="w-full p-1.5 sm:p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="eventAttendees" className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Attendees (comma-separated emails)</label>
                  <input
                    type="text"
                    name="attendees"
                    id="eventAttendees"
                    value={newEventForm.attendees}
                    onChange={handleNewEventFormChange}
                    className="w-full p-1.5 sm:p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm"
                    placeholder="user1@example.com, user2@example.com"
                  />
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2 sm:pt-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateEventModalOpen(false)}
                    className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
              <button
                    type="submit"
                    disabled={connectionStatus !== 'connected'}
                    className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                    Create Event
              </button>
                </div>
              </form>
            </div>
            </div>
          )}
      </div>
    </div>
  );
}