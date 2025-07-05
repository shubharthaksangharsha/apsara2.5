import { useState, useRef, useEffect } from 'react';
import { useConnectionSetup } from './connection-setup';
import { useSessionManagement } from './session-management';
import { getMostRecentSessionHandle } from '../../../utils/liveSessionStorage';

// Main connection hook that combines all the connection-related modules
export const useConnection = ({ 
  addLiveMessage, 
  updateLiveMessage, 
  addOrUpdateLiveModelMessagePart,
  resetStreamingRefs,
  initAudioContexts,
  closeAudioContexts,
  stopRecording,
  stopVideoStream,
  enqueueAudio,
  stopAndClearAudio,
  isRecording,
  resetSpeakingState,
  audioContextRef,
  audioInputContextRef,
  inputTranscriptionBufferRef,
  outputTranscriptionBufferRef,
  lastTranscriptionChunkRef,
  getMessagesCount,
  currentVoice,
  transcriptionEnabled,
  slidingWindowEnabled, 
  slidingWindowTokens,
  nativeAudioFeature,
  mediaResolution
}) => {
  // Core state 
  const [liveConnectionStatus, setLiveConnectionStatus] = useState('disconnected');
  const [liveModality, setLiveModality] = useState('AUDIO');
  const [liveSystemInstruction, setLiveSystemInstruction] = useState('You are a helpful assistant.');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash-live-001');
  const [sessionTimeLeft, setSessionTimeLeft] = useState(null);
  const [mapDisplayData, setMapDisplayData] = useState(null);
  const [weatherUIData, setWeatherUIData] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarEventsLastUpdated, setCalendarEventsLastUpdated] = useState(0);
  const [activeTab, setActiveTab] = useState('chat');
  const [tokenUsage, setTokenUsage] = useState({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    lastUpdated: 0
  });

  // Refs
  const liveWsConnection = useRef(null);
  const sessionResumeHandleRef = useRef(null);
  
  // Check localStorage for most recent session handle on initialization
  useEffect(() => {
    const mostRecentHandle = getMostRecentSessionHandle();
    if (mostRecentHandle) {
      console.log("[useLiveSession] Found recent session handle in localStorage:", mostRecentHandle);
    }
  }, []);
  
  // Setup connection module and access its functions
  const { setupLiveConnection } = useConnectionSetup({
    liveWsConnection,
    sessionResumeHandleRef,
    liveModality,
    liveSystemInstruction,
    selectedModel,
    setLiveConnectionStatus,
    setMapDisplayData,
    setWeatherUIData,
    setCalendarEvents,
    setCalendarEventsLastUpdated,
    setTokenUsage,
    setSessionTimeLeft,
    setActiveTab,
    addLiveMessage,
    updateLiveMessage,
    addOrUpdateLiveModelMessagePart,
    resetStreamingRefs,
    getMessagesCount,
    initAudioContexts,
    closeAudioContexts,
    stopRecording,
    resetSpeakingState,
    stopAndClearAudio,
    enqueueAudio,
    isRecording,
    audioContextRef,
    audioInputContextRef,
    inputTranscriptionBufferRef,
    outputTranscriptionBufferRef,
    lastTranscriptionChunkRef,
    // Session options
    currentVoice,
    transcriptionEnabled,
    slidingWindowEnabled, 
    slidingWindowTokens,
    nativeAudioFeature,
    mediaResolution
  });
  
  // Setup session management module
  const { 
    startLiveSession, 
    endLiveSession, 
    sendLiveMessageText,
    setSessionResumeHandle,
    handleAutoSessionResume 
  } = useSessionManagement({
    liveWsConnection,
    sessionResumeHandleRef,
    liveConnectionStatus,
    liveModality,
    liveSystemInstruction,
    selectedModel,
    setupLiveConnection,
    initAudioContexts,
    closeAudioContexts,
    stopRecording,
    resetSpeakingState,
    stopVideoStream,
    isRecording,
    addLiveMessage,
    setLiveConnectionStatus,
    setMapDisplayData,
    setWeatherUIData,
    setCalendarEvents,
    setCalendarEventsLastUpdated,
    // Pass session defaults
    currentVoice,
    transcriptionEnabled,
    slidingWindowEnabled, 
    slidingWindowTokens,
    nativeAudioFeature,
    mediaResolution
  });
  
  return {
    // State
    liveConnectionStatus,
    liveModality,
    sessionTimeLeft,
    liveSystemInstruction,
    selectedModel,
    mapDisplayData,
    weatherUIData,
    calendarEvents,
    calendarEventsLastUpdated,
    activeTab,
    
    // Functions
    setLiveModality,
    setLiveSystemInstruction,
    setSelectedModel,
    setActiveTab,
    setMapDisplayData,
    startLiveSession,
    endLiveSession,
    sendLiveMessage: sendLiveMessageText,
    setSessionResumeHandle,
    handleAutoSessionResume,
    
    // Connection
    wsConnection: liveWsConnection,
    currentSessionHandle: sessionResumeHandleRef.current
  };
}; 