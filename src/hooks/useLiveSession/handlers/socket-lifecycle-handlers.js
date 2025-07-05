import { useCallback } from 'react';

export const useSocketLifecycleHandlers = ({
  liveWsConnection,
  addLiveMessage,
  setLiveConnectionStatus,
  closeAudioContexts,
  isRecording,
  stopRecording,
  resetSpeakingState,
  resetStreamingRefs,
  setSessionTimeLeft,
  setMapDisplayData,
  setWeatherUIData,
  setCalendarEvents,
  setCalendarEventsLastUpdated
}) => {
  
  // Handle WebSocket error events
  const handleWebSocketError = useCallback((errorEvent) => {
    console.error('[Live WS] WebSocket error event:', errorEvent);
    addLiveMessage({ role: 'error', text: 'WebSocket connection error.' });
    setLiveConnectionStatus('error');
    setSessionTimeLeft(null); // Reset timer on error
    setMapDisplayData(null); // Clear map on error
    setWeatherUIData(null); // Clear weather data on error
    setCalendarEvents([]); // Clear calendar events on error
    setCalendarEventsLastUpdated(0); // Reset
  }, [
    addLiveMessage, 
    setLiveConnectionStatus, 
    setSessionTimeLeft,
    setMapDisplayData,
    setWeatherUIData,
    setCalendarEvents,
    setCalendarEventsLastUpdated
  ]);
  
  // Handle WebSocket close events
  const handleWebSocketClose = useCallback((event) => {
    console.log(`[Live WS] Connection closed. Code: ${event.code}, Clean: ${event.wasClean}, Reason: ${event.reason}`);
    setLiveConnectionStatus(prev => prev === 'error' ? 'error' : 'disconnected');
    if (!event.wasClean && event.code !== 1000) { 
      addLiveMessage({ role: 'system', text: `Connection lost (Code: ${event.code}).` }); 
    }
    liveWsConnection.current = null; // Clear the ref
    closeAudioContexts(); // Close both contexts
    if (isRecording) stopRecording();
    resetSpeakingState(); // Reset model speaking state
    resetStreamingRefs();
    setSessionTimeLeft(null); // Reset timer on close
    setMapDisplayData(null); // Clear map on close
    setWeatherUIData(null); // Clear weather data on close
    setCalendarEvents([]); // Clear calendar events on close
    setCalendarEventsLastUpdated(0); // Reset
  }, [
    addLiveMessage,
    setLiveConnectionStatus,
    liveWsConnection,
    closeAudioContexts,
    isRecording,
    stopRecording,
    resetSpeakingState,
    resetStreamingRefs,
    setSessionTimeLeft,
    setMapDisplayData,
    setWeatherUIData,
    setCalendarEvents,
    setCalendarEventsLastUpdated
  ]);
  
  return {
    handleWebSocketError,
    handleWebSocketClose
  };
}; 