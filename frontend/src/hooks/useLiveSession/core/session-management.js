import { useCallback } from 'react';
import { updateSessionWithHandle, saveDisconnectedSession } from '../../../utils/liveSessionStorage';

export const useSessionManagement = ({
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
  // Session options
  currentVoice,
  transcriptionEnabled,
  slidingWindowEnabled, 
  slidingWindowTokens,
  nativeAudioFeature,
  mediaResolution
}) => {
  // Start a new live session or resume an existing one
  const startLiveSession = useCallback((mainChatContext = null, sessionOptions = {}) => {
    console.log("[Live WS] Starting live session with model:", selectedModel);
    console.log("🔍 [Live WS] Session options received:", sessionOptions);
    console.log("🔍 [Live WS] RAG-specific options:", {

    });
    
    // Clear any previous media state
    if (isRecording) {
      stopRecording();
    }
    stopVideoStream();
    
    // Clear UI data if starting a new session (not resuming)
    if (!sessionResumeHandleRef.current) {
      setMapDisplayData(null);
      setWeatherUIData(null);
      setCalendarEvents([]);
      setCalendarEventsLastUpdated(0);
    }
    
    // Initialize audio contexts before setting up connection
    initAudioContexts();
    
    // Change status to connecting
    setLiveConnectionStatus('connecting');
    
    // Set up WebSocket connection with options
    const connectionOptions = {
      currentVoice,
      transcriptionEnabled,
      slidingWindowEnabled,
      slidingWindowTokens,
      nativeAudioFeature,
      mediaResolution,
      // Extract RAG parameters from sessionOptions

    };
    
    console.log("🔍 [Live WS] Final connection options:", connectionOptions);
    setupLiveConnection(mainChatContext, connectionOptions);
  }, [
    selectedModel, 
    isRecording, 
    stopRecording, 
    stopVideoStream, 
    sessionResumeHandleRef, 
    setMapDisplayData, 
    setWeatherUIData, 
    setCalendarEvents, 
    setCalendarEventsLastUpdated, 
    initAudioContexts, 
    setLiveConnectionStatus, 
    setupLiveConnection
  ]);

  // End the current live session
  const endLiveSession = useCallback(() => {
    console.log("[Live WS] Ending live session.");

    // Close WebSocket connection if it exists
    if (liveWsConnection.current) {
      // Store session information before ending it
      const resumeHandle = liveWsConnection.current.sessionResumeHandle;
      if (resumeHandle) {
        saveDisconnectedSession(resumeHandle);
      }
      
      liveWsConnection.current.close(1000, "Ending session");
      liveWsConnection.current = null;
    }

    // Reset connection status
    setLiveConnectionStatus('disconnected');
    
    // Clean up audio contexts
    closeAudioContexts();
    
    // Reset speaking state if needed
    resetSpeakingState();
    
    // Add system message
    addLiveMessage({
      role: 'system',
      text: 'Session ended.',
    });
  }, [
    liveWsConnection, 
    setLiveConnectionStatus, 
    closeAudioContexts, 
    resetSpeakingState, 
    addLiveMessage
  ]);

  // Send a message to the live session
  const sendLiveMessageText = useCallback((text, ws = null) => {
    const conn = ws || liveWsConnection.current;
    if (!conn) {
      console.error('[Live WS] Cannot send message - no connection.');
      return;
    }
    
    if (!text || text.trim() === '') {
      console.warn('[Live WS] Not sending empty message.');
      return;
    }
    
    // Create and add user message to the UI
    const userMessageId = crypto.randomUUID();
    addLiveMessage({
      id: userMessageId,
      role: 'user',
      text: text
    });
    
    // Send the message to the server
    const message = {
      type: 'text',
      text: text,
      messageId: userMessageId
    };
    
    try {
      conn.send(JSON.stringify(message));
    } catch (err) {
      console.error('[Live WS] Error sending message:', err);
      addLiveMessage({
        role: 'system',
        text: `Error sending message: ${err.message}`
      });
    }
  }, [liveWsConnection, addLiveMessage]);

  // Set the session resume handle for later use
  const setSessionResumeHandle = useCallback((handle) => {
    console.log("[Live WS] Storing session resume handle:", handle);
    sessionResumeHandleRef.current = handle;
  }, [sessionResumeHandleRef]);

  // Handle auto session resumption
  const handleAutoSessionResume = useCallback((handle, options = {}) => {
    console.log("[Live WS] Auto resuming session with handle:", handle);
    
    // Store the handle for resumption
    sessionResumeHandleRef.current = handle;
    
    // Update localStorage to track this session
    updateSessionWithHandle(handle);
    
    // Start the session using the stored handle
    startLiveSession(null, options);
  }, [sessionResumeHandleRef, startLiveSession]);

  return {
    startLiveSession,
    endLiveSession,
    sendLiveMessageText,
    setSessionResumeHandle,
    handleAutoSessionResume
  };
}; 