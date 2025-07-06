import { useCallback } from 'react';
import { useMessageHandlers } from '../handlers/message-handlers';

export const useConnectionSetup = ({
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
}) => {
  // Import message handlers
  const { 
    handleWebSocketMessage,
    handleWebSocketError,
    handleWebSocketClose 
  } = useMessageHandlers({
    liveWsConnection,
    sessionResumeHandleRef,
    liveModality,
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
    lastTranscriptionChunkRef
  });

  // Main connection setup function
  const setupLiveConnection = useCallback((mainChatContext = null, {
    currentVoice,
    transcriptionEnabled = true,
    slidingWindowEnabled = true,
    slidingWindowTokens = 4000,
    nativeAudioFeature = 'none',
    mediaResolution = 'MEDIA_RESOLUTION_MEDIUM',
    ragEnabled = false,
    ragStoreId = null,
    ragSimilarityTopK = 5,
    ragVectorDistanceThreshold = 0.3
  } = {}) => {
    console.log('🔄 [Live WS] setupLiveConnection CALLED with nativeAudioFeature:', nativeAudioFeature);
    console.log('🔍 [Live WS] RAG Parameters received:', {
      ragEnabled,
      ragStoreId,
      ragSimilarityTopK,
      ragVectorDistanceThreshold
    });
    
    // Handle existing connection
    if (liveWsConnection.current) {
      console.warn('[Live WS] Connection already exists - cleaning up first.');
      liveWsConnection.current.close(1000, "Starting new session");
      // Let the onclose handler clean up properly first
      setTimeout(() => setupLiveConnection(mainChatContext, {
        currentVoice,
        transcriptionEnabled,
        slidingWindowEnabled,
        slidingWindowTokens,
        nativeAudioFeature,
        mediaResolution,
        ragEnabled,
        ragStoreId,
        ragSimilarityTopK,
        ragVectorDistanceThreshold
      }), 250);
      return;
    }

    // Only use resumeHandle if explicitly requested via loadSession
    // We'll clear it after use to prevent auto-resuming on subsequent connections
    const resumeHandle = sessionResumeHandleRef.current;
    
    // Clear the handle immediately so we don't reuse it accidentally
    sessionResumeHandleRef.current = null;

    // Build the correct WS URL with optional query parameters
    const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    // Use URL object to build the URL
    const wsUrl = new URL("/live", baseUrl);
    wsUrl.protocol = baseUrl.startsWith('https') ? 'wss:' : 'ws:';

    // Add model as query parameter
    wsUrl.searchParams.append('model', selectedModel);
    
    // Check if this is a native audio model
    const isNativeAudioModel = selectedModel?.includes('native-audio');
    
    console.log('🔄 [Live WS] setupLiveConnection with selected model:', selectedModel);
    console.log('🔄 [Live WS] isNativeAudioModel:', isNativeAudioModel);
    
    if (isNativeAudioModel) {
      console.log('[Live WS] Using native audio model:', selectedModel);
      
      // Handle native audio features - based on nativeAudioFeature selection
      if (nativeAudioFeature === 'affectiveDialog') {
        console.log('🎯 [Live WS] Enabling Affective Dialog feature');
        wsUrl.searchParams.append('enableAffectiveDialog', 'true');
      } else if (nativeAudioFeature === 'proactiveAudio') {
        console.log('🎯 [Live WS] Enabling Proactive Audio feature');
        wsUrl.searchParams.append('proactiveAudio', 'true');
      } else {
        // Default to generic native audio if no specific feature selected
        console.log('🎯 [Live WS] No specific feature selected, using generic native audio');
        wsUrl.searchParams.append('nativeAudio', 'true');
      }
      
      // Log final URL parameters for debugging
      console.log('🔍 [Live WS] Final WebSocket URL parameters:', {
        affectiveDialog: wsUrl.searchParams.has('enableAffectiveDialog'),
        proactiveAudio: wsUrl.searchParams.has('proactiveAudio'),
        genericNativeAudio: wsUrl.searchParams.has('nativeAudio')
      });
      
      // Configure Voice Activity Detection (VAD) settings for native audio models
      wsUrl.searchParams.append('vadMode', 'AUTO');
      wsUrl.searchParams.append('vadFallbackTimeoutMs', '5000');
      wsUrl.searchParams.append('vadSensitivity', '0.7');
    }
    
    // Add modality as query parameter
    wsUrl.searchParams.append('modalities', liveModality);

    // Set voice parameter if audio is requested
    if (liveModality === 'AUDIO' || liveModality === 'AUDIO_TEXT') {
      // Native audio models automatically choose appropriate voice processing
      // but we still pass the voice parameter for proper tracking
      wsUrl.searchParams.append('voice', currentVoice || 'Ember');
      
      // Add advanced audio parameters for native audio models
      if (isNativeAudioModel) {
        // High quality audio for native audio models (48kHz sample rate)
        wsUrl.searchParams.append('audioQuality', 'high');
      }
      
      // Configure context window compression for longer sessions
      wsUrl.searchParams.append('slidingWindowEnabled', (slidingWindowEnabled || false).toString());
      if (slidingWindowEnabled && slidingWindowTokens) {
        wsUrl.searchParams.append('slidingWindowTokens', slidingWindowTokens.toString());
      }
    }

    // Set system instruction if available
    if (liveSystemInstruction) {
      wsUrl.searchParams.append('systemInstruction', liveSystemInstruction);
    }

    // Get transcription preference
    if (transcriptionEnabled !== undefined) {
      wsUrl.searchParams.append('transcriptionEnabled', transcriptionEnabled.toString());
    }

    // Add sliding window settings if applicable
    if (slidingWindowEnabled !== undefined) {
      wsUrl.searchParams.append('slidingWindowEnabled', slidingWindowEnabled.toString());
      wsUrl.searchParams.append('slidingWindowTokens', slidingWindowTokens.toString());
    }
    
    // Add media resolution parameter
    if (mediaResolution) {
      console.log(`🔍 [Live WS] Adding media resolution: ${mediaResolution}`);
      wsUrl.searchParams.append('mediaResolution', mediaResolution);
    }

    // Add RAG (Retrieval-Augmented Generation) parameters if enabled
    if (ragEnabled && ragStoreId) {
      console.log('🎯 [Live WS] Adding RAG parameters:', {
        storeId: ragStoreId,
        similarityTopK: ragSimilarityTopK,
        vectorDistanceThreshold: ragVectorDistanceThreshold
      });
      
      wsUrl.searchParams.append('enableRagContextStoring', 'true');
      wsUrl.searchParams.append('ragStoreId', ragStoreId);
      wsUrl.searchParams.append('ragSimilarityTopK', ragSimilarityTopK.toString());
      wsUrl.searchParams.append('ragVectorDistanceThreshold', ragVectorDistanceThreshold.toString());
    }

    // Add session resumption handle if available (from previous connection)
    if (resumeHandle) {
      console.log("[Live WS] Attempting to resume session with handle:", resumeHandle);
      wsUrl.searchParams.append('resumeHandle', resumeHandle);
      
      // Log that we're resuming a session
      addLiveMessage({ 
        role: 'system', 
        text: 'Resuming previous session...', 
      });
      
      // When resuming a session, we don't clear the messages or context
      // This ensures that maps, weather, and calendar data are preserved
    } else {
      // Starting a new fresh session - cleared messages already in startLiveSession
      addLiveMessage({ 
        role: 'system', 
        text: 'Starting new session...', 
      });
      
      // Make sure context-specific data is cleared for a new session
      setMapDisplayData(null);
      setWeatherUIData(null);
      setCalendarEvents([]);
      setCalendarEventsLastUpdated(0);
    }
    
    // Update status to "connecting"
    setLiveConnectionStatus('connecting');
    
    // Create WebSocket connection with the constructed URL
    try {
      console.log("[Live WS] Creating WebSocket connection to:", wsUrl.toString());
      const ws = new WebSocket(wsUrl.toString());
      
      // Store the WebSocket connection in the ref for later use
      liveWsConnection.current = ws;
      
      // Set up event handlers
      ws.onopen = () => {
        console.log('[Live WS] Connection opened');
        addLiveMessage({ role: 'system', text: 'Connection established.' });
        
        // Initialize audio context if needed for modality
        if (liveModality === 'AUDIO' || liveModality === 'AUDIO_TEXT') {
          initAudioContexts();
        }
      };
      
      ws.onmessage = handleWebSocketMessage;
      ws.onerror = handleWebSocketError;
      ws.onclose = handleWebSocketClose;

      // Expose the sendLiveMessageText method on the WebSocket object for convenience
      ws.sendLiveMessageText = (text) => {
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
          ws.send(JSON.stringify(message));
        } catch (err) {
          console.error('[Live WS] Error sending message:', err);
          addLiveMessage({
            role: 'system',
            text: `Error sending message: ${err.message}`
          });
        }
      };
      
      // Return the WebSocket connection
      return ws;
    } catch (err) {
      console.error('[Live WS] Error creating WebSocket connection:', err);
      addLiveMessage({ role: 'error', text: `Connection error: ${err.message}` });
      setLiveConnectionStatus('error');
      return null;
    }
  }, [
    liveWsConnection,
    sessionResumeHandleRef,
    selectedModel,
    liveModality,
    liveSystemInstruction,
    setLiveConnectionStatus,
    setMapDisplayData,
    setWeatherUIData,
    setCalendarEvents,
    setCalendarEventsLastUpdated,
    addLiveMessage,
    initAudioContexts,
    handleWebSocketMessage,
    handleWebSocketError,
    handleWebSocketClose
  ]);
  
  // Return setup function
  return { setupLiveConnection };
}; 