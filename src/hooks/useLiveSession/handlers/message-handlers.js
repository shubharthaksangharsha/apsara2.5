import { useCallback } from 'react';
import { useEventHandlers } from './event-handlers';
import { useToolHandlers } from './tool-handlers';
import { useContentHandlers } from './content-handlers';
import { useSocketLifecycleHandlers } from './socket-lifecycle-handlers';

export const useMessageHandlers = (props) => {
  const { 
    liveWsConnection,
    sessionResumeHandleRef,
    setTokenUsage,
    resetStreamingRefs,
    addLiveMessage
  } = props;
  
  // Import specialized handlers
  const eventHandlers = useEventHandlers(props);
  const toolHandlers = useToolHandlers(props);
  const contentHandlers = useContentHandlers(props);
  const socketHandlers = useSocketLifecycleHandlers(props);
  
  // Main WebSocket message handler that routes to appropriate specialized handlers
  const handleWebSocketMessage = useCallback((event) => {
    if (!event.data) {
      console.warn('[Live WS] Received empty message data.');
      return;
    }

    try {
      const data = JSON.parse(event.data);
      console.log('[Live WS] Successfully parsed data:', data);

      // --- Handle different event types ---
      if (data.event === 'map_display_update') {
        eventHandlers.handleMapDisplayUpdate(data.mapData);
      } 
      else if (data.event === 'imageGenerated' || data.event === 'imageEdited') {
        eventHandlers.handleImageEvent(data);
      } 
      else if (['backend_connected', 'connected', 'error', 'closed'].includes(data.event)) {
        eventHandlers.handleConnectionEvent(data.event, data.message, data.code);
      } 
      // --- Handle Tool Events ---
      else if (data.event === 'tool_call_started') {
        toolHandlers.handleToolCallStarted(data.calls);
      } 
      else if (data.event === 'tool_call_result') {
        toolHandlers.handleToolCallResult(data.name, data.result);
      } 
      else if (data.event === 'tool_call_error') {
        toolHandlers.handleToolCallError(data.name, data.error);
      }
      // --- Handle Server Content (model responses, transcriptions) ---
      else if (data.serverContent) {
        const { turnOrGenComplete } = contentHandlers.handleServerContent(data.serverContent);
        
        // Reset streaming refs on completion
        if (turnOrGenComplete) {
          console.log("🔄 [Live WS] Resetting text streaming refs.");
          resetStreamingRefs();
        }
      } 
      // --- Handle Session Resumption ---
      else if (data.sessionResumptionUpdate) {
        eventHandlers.handleSessionResumptionUpdate(data.sessionResumptionUpdate);
      }
      // --- Handle Token Usage ---
      else if (data.usageMetadata) {
        contentHandlers.handleUsageMetadata(data.usageMetadata, setTokenUsage);
      }
      // --- Handle GoAway (timeout warning) ---
      else if (data.goAway) {
        eventHandlers.handleGoAwayEvent(data.goAway);
      }
      // --- Catch Unhandled Structures ---
      else if (!data.event) { // Only warn if it's not one of the handled 'event' types
        console.warn('[Live WS] Received unhandled message structure:', data);
        addLiveMessage({
          role: 'system', 
          text: `(Debug: Unhandled msg ${JSON.stringify(data).substring(0, 50)}...)`
        });
      }
    } catch (err) {
      console.error('[Live WS] JSON Parse Error or Processing Error:', err, 'Raw data:', event.data);
      addLiveMessage({ role: 'error', text: `Frontend error: ${err.message}` });
    }
  }, [
    eventHandlers,
    toolHandlers, 
    contentHandlers,
    resetStreamingRefs,
    setTokenUsage,
    addLiveMessage
  ]);
  
  return {
    handleWebSocketMessage,
    handleWebSocketError: socketHandlers.handleWebSocketError,
    handleWebSocketClose: socketHandlers.handleWebSocketClose
  };
}; 