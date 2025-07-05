import { useCallback } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { updateSessionWithHandle, saveDisconnectedSession } from '../../../utils/liveSessionStorage';

// Handle general events like map updates, image generation, connection status
export const useEventHandlers = ({
  liveWsConnection,
  sessionResumeHandleRef,
  liveModality,
  setLiveConnectionStatus,
  setMapDisplayData,
  setSessionTimeLeft,
  addLiveMessage,
  getMessagesCount
}) => {

  // Handle map display updates
  const handleMapDisplayUpdate = useCallback((mapData) => {
    setMapDisplayData(mapData);
  }, [setMapDisplayData]);

  // Handle image generation events
  const handleImageEvent = useCallback((data) => {
    // Create a message with image and description
    const imageMessage = {
      role: 'model',
      id: `img-${Date.now()}`,
      parts: [
        // Add the text description if available
        ...(data.description ? [{ text: data.description }] : []),
        // Add the image data
        {
          inlineData: {
            mimeType: data.mimeType || 'image/png',
            data: data.imageData
          }
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    // Add the message to the chat
    addLiveMessage(imageMessage);
    console.log(`🖼️ [Live WS - useLiveSession] Image ${data.event === 'imageGenerated' ? 'generation' : 'editing'} complete`);
  }, [addLiveMessage]);

  // Handle connection status events
  const handleConnectionEvent = useCallback((event, message, code) => {
    if (event === 'backend_connected') {
      addLiveMessage({ role: 'system', text: 'Backend ready. AI connection pending.' });
    } else if (event === 'connected') {
      addLiveMessage({ role: 'system', text: 'Live AI connection active.' });
      setLiveConnectionStatus('connected');
    } else if (event === 'error') {
      console.error("🔴 [Live WS] Processing 'error':", message);
      addLiveMessage({ role: 'error', text: `Error: ${message || 'Unknown'}` });
      setLiveConnectionStatus('error');
    } else if (event === 'closed') {
      addLiveMessage({ role: 'system', text: `AI connection closed (${code || 'N/A'}).` });
    }
  }, [addLiveMessage, setLiveConnectionStatus]);

  // Handle session resumption events
  const handleSessionResumptionUpdate = useCallback((data) => {
    if (data.newHandle) {
      sessionResumeHandleRef.current = data.newHandle;
      console.log("[Live WS] Stored new session resume handle.");
      
      try {
        updateSessionWithHandle(data.newHandle, {
          modality: liveModality,
          voice: null,
          systemInstruction: liveModality,
          timestamp: Date.now()
        });
        console.log("[Live WS] Auto-saved session handle from backend to localStorage");
      } catch (err) {
        console.error("[Live WS] Error auto-saving session handle to localStorage:", err);
      }
    }
  }, [sessionResumeHandleRef, liveModality]);

  // Handle session timeout warning (GoAway message)
  const handleGoAwayEvent = useCallback((data) => {
    console.log("⏰ [Live WS] GoAway message received with timeLeft:", data.timeLeft);
    const timeLeftStr = data.timeLeft;
    setSessionTimeLeft(timeLeftStr);
    
    // Show warning to user
    addLiveMessage({ 
      role: 'system', 
      text: `⚠️ Session will end in approximately ${timeLeftStr}. Session will be saved before disconnection.`,
      icon: Clock 
    });
    
    // Save the session when we get close to timeout
    if (sessionResumeHandleRef.current) {
      const shouldSaveBeforeDisconnect = timeLeftStr.includes("15s") || timeLeftStr.includes("10s");
      
      if (shouldSaveBeforeDisconnect) {
        console.log("[Live WS] Saving session before disconnection due to timeout");
        try {
          saveDisconnectedSession(sessionResumeHandleRef.current, {
            modality: liveModality,
            voice: null,
            systemInstruction: liveModality,
            messageCount: getMessagesCount(),
            timestamp: Date.now()
          });
          
          addLiveMessage({ 
            role: 'system', 
            text: '💾 Session saved before disconnection. You can resume it from the Saved Sessions panel.',
            icon: RefreshCw 
          });
          
          console.log("[Live WS] Successfully saved session before disconnection");
        } catch (error) {
          console.error("[Live WS] Error saving session before disconnection:", error);
        }
      }
    }
  }, [addLiveMessage, sessionResumeHandleRef, liveModality, setSessionTimeLeft, getMessagesCount]);

  return {
    handleMapDisplayUpdate,
    handleImageEvent,
    handleConnectionEvent,
    handleSessionResumptionUpdate,
    handleGoAwayEvent
  };
}; 