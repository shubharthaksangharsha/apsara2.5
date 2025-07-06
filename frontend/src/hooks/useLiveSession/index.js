import { useEffect } from 'react';
import { Mic, AudioLines } from 'lucide-react';
import { useAudio } from './features/audio';
import { useVideo } from './features/video';
import { useScreenShare } from './features/screenShare';
import { useMessaging } from './features/messages';
import { useConnection } from './core/connection-core';

export function useLiveSession({ 
  currentVoice,
  transcriptionEnabled = true, 
  slidingWindowEnabled = true, 
  slidingWindowTokens = 4000, 
  nativeAudioFeature = 'none', 
  mediaResolution = 'MEDIA_RESOLUTION_MEDIUM'
}) {
  // Initialize the messaging module first
  const messaging = useMessaging();
  const { 
    liveMessages, 
    setLiveMessages, 
    addLiveMessage, 
    updateLiveMessage, 
    addOrUpdateLiveModelMessagePart,
    resetStreamingRefs,
    liveStreamingTextRef,
    liveStreamingMsgIdRef
  } = messaging;

  // Initialize audio module
  const audio = useAudio({ 
    selectedModel: 'gemini-2.0-flash-live-001', // Initial default value
    inputSampleRate: 16000, 
    addLiveMessage
  });
  const { 
    isModelSpeaking, 
    isRecording, 
    audioError, 
    initAudioContexts, 
    closeAudioContexts,
    playAudioQueue,
    enqueueAudio,
    stopAndClearAudio,
    startRecording: startRecordingInternal,
    stopRecording: stopRecordingInternal,
    audioContextRef,
    audioInputContextRef,
    inputTranscriptionBufferRef,
    outputTranscriptionBufferRef,
    lastTranscriptionChunkRef
  } = audio;

  // Initialize video module
  const video = useVideo({ addLiveMessage });
  const {
    isStreamingVideo,
    videoDevices,
    selectedVideoDeviceId,
    setSelectedVideoDeviceId,
    getVideoInputDevices,
    startVideoStream: startVideoStreamInternal,
    stopVideoStream: stopVideoStreamInternal,
    flipCamera: flipCameraInternal,
    videoStreamRef
  } = video;

  // Initialize screen sharing module
  const screenShare = useScreenShare({ addLiveMessage });
  const {
    isStreamingScreen,
    startScreenShare: startScreenShareInternal,
    stopScreenShare: stopScreenShareInternal,
    screenStreamRef
  } = screenShare;

  // Initialize connection module last, since it depends on the others
  const connection = useConnection({
    addLiveMessage,
    updateLiveMessage,
    addOrUpdateLiveModelMessagePart,
    resetStreamingRefs,
    initAudioContexts,
    closeAudioContexts,
    stopRecording: stopRecordingInternal,
    stopVideoStream: stopVideoStreamInternal,
    enqueueAudio,
    stopAndClearAudio,
    isRecording,
    resetSpeakingState: audio.resetSpeakingState,
    audioContextRef,
    audioInputContextRef,
    inputTranscriptionBufferRef,
    outputTranscriptionBufferRef,
    lastTranscriptionChunkRef,
    getMessagesCount: () => liveMessages.length,
    currentVoice,
    transcriptionEnabled,
    slidingWindowEnabled, 
    slidingWindowTokens,
    nativeAudioFeature,
    mediaResolution
  });
  const {
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
    setLiveModality,
    setLiveSystemInstruction,
    setSelectedModel,
    setActiveTab,
    setMapDisplayData,
    startLiveSession: startLiveSessionInternal,
    endLiveSession,
    sendLiveMessage,
    setSessionResumeHandle,
    handleAutoSessionResume,
    wsConnection,
    currentSessionHandle
  } = connection;

  // --- Cleanup Effect ---
  useEffect(() => {
    return () => {
      console.log("[Live Hook] Unmounting - ensuring session cleanup.");
      if (wsConnection.current) {
        wsConnection.current.close(1000, "Component unmounting");
      }
      closeAudioContexts();
    };
  }, [closeAudioContexts, wsConnection]);

  // --- Public Wrapper Functions ---
  // We need to wrap some functions to provide proper parameters
  const startRecording = async () => {
    await startRecordingInternal(wsConnection.current, liveConnectionStatus);
  };

  const stopRecording = () => {
    stopRecordingInternal();
  };

  const startVideoStream = async () => {
    await startVideoStreamInternal(wsConnection.current, liveConnectionStatus);
  };

  const stopVideoStream = () => {
    stopVideoStreamInternal();
  };

  const startScreenShare = async () => {
    await startScreenShareInternal(wsConnection.current);
  };
  
  const stopScreenShare = () => {
    stopScreenShareInternal();
  };
  
  const flipCamera = async () => {
    await flipCameraInternal(wsConnection.current, liveConnectionStatus);
  };

  const startLiveSession = (mainChatContext = null, sessionOptions = {}) => {
    console.log("🔍 [useLiveSession] startLiveSession called with:", {
      mainChatContext: !!mainChatContext,
      sessionOptions: sessionOptions
    });
    
    if (liveConnectionStatus === 'connected') {
      console.warn('[Live WS] Already connected. Use endLiveSession first.');
      return;
    }
    
    // Only clear messages if we're not resuming an existing session
    if (!currentSessionHandle) {
      setLiveMessages([]);
    }
    
    const finalSessionOptions = {
      currentVoice,
      transcriptionEnabled,
      slidingWindowEnabled,
      slidingWindowTokens,
      nativeAudioFeature,
      mediaResolution,
      // Add RAG parameters from sessionOptions
      ragEnabled: sessionOptions.ragEnabled || false,
      ragStoreId: sessionOptions.ragStoreId || null,
      ragSimilarityTopK: sessionOptions.ragSimilarityTopK || 5,
      ragVectorDistanceThreshold: sessionOptions.ragVectorDistanceThreshold || 0.3
    };
    
    console.log("🔍 [useLiveSession] Final session options being passed:", finalSessionOptions);
    
    startLiveSessionInternal(mainChatContext, finalSessionOptions);
  };

  return {
    // State
    liveMessages, 
    liveConnectionStatus, 
    liveModality, 
    isModelSpeaking, 
    isRecording, 
    isStreamingVideo, 
    isStreamingScreen,
    mediaStream: videoStreamRef.current,
    screenStream: screenStreamRef.current,
    audioError,
    sessionTimeLeft,
    liveSystemInstruction,
    selectedModel,
    videoDevices,
    selectedVideoDeviceId,
    mapDisplayData,
    weatherUIData,
    calendarEvents,
    calendarEventsLastUpdated,
    currentSessionHandle,
    activeTab,

    // Setters/Handlers
    setLiveModality,
    setLiveSystemInstruction,
    setSelectedModel,
    setSelectedVideoDeviceId,
    getVideoInputDevices,
    setMapDisplayData,
    startLiveSession, 
    endLiveSession, 
    sendLiveMessage,
    startRecording, 
    stopRecording,
    startVideoStream, 
    stopVideoStream,
    startScreenShare,
    stopScreenShare,
    flipCamera,
    handleAutoSessionResume,
    setSessionResumeHandle,
    setActiveTab
  };
} 