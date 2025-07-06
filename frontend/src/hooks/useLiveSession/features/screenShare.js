import { useState, useRef, useCallback, useEffect } from 'react';

export const useScreenShare = ({ addLiveMessage }) => {
  // State
  const [isStreamingScreen, setIsStreamingScreen] = useState(false);
  
  // Refs
  const screenStreamRef = useRef(null);
  const screenVideoElementRef = useRef(null);
  const screenCanvasElementRef = useRef(null);
  const isScreenSharingRef = useRef(isStreamingScreen);

  // --- Sync state to ref ---
  useEffect(() => {
    isScreenSharingRef.current = isStreamingScreen;
  }, [isStreamingScreen]);

  // --- Screen Sharing Logic ---
  const stopScreenShareInternal = useCallback(() => {
    if (!isScreenSharingRef.current) {
      return;
    }
    console.log('[Screen Share] Stopping screen share internally.');
    addLiveMessage({ role: 'system', text: 'Screen share stopped.' });

    setIsStreamingScreen(false);
    isScreenSharingRef.current = false;

    screenStreamRef.current?.getTracks().forEach(track => {
      track.stop();
      console.log(`[Screen Share] Stopped track: ${track.label || track.id}`);
    });
    screenStreamRef.current = null;

    // Clean up screen share specific video element
    if (screenVideoElementRef.current) {
        screenVideoElementRef.current.pause();
        screenVideoElementRef.current.srcObject = null;
        screenVideoElementRef.current.onloadedmetadata = null;
        screenVideoElementRef.current.onerror = null;
        console.log('[Screen Share] Detached stream and cleaned up screenVideoElementRef listeners.');
    }
    // No need to destroy screenVideoElementRef, it can be reused.
    // screenCanvasElementRef does not hold resources directly that need explicit cleanup beyond its use.
  }, [addLiveMessage]);

  const startScreenShareInternal = useCallback(async (ws) => {
    if (!ws || isScreenSharingRef.current) return;

    try {
      // Check if mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // For Samsung devices on newer Android/Chrome
        const isChrome = /Chrome/i.test(navigator.userAgent);
        const isSamsung = /SM-|Galaxy|samsung/i.test(navigator.userAgent);
        
        if (isChrome && isSamsung) {
          console.log("[Screen Share] Attempting screen share on Samsung device with Chrome");
          addLiveMessage({ 
            role: 'system', 
            text: 'Attempting screen share. Please accept permission prompt.'
          });
        } else {
          // Show specific message for unsupported browser/device combinations
          addLiveMessage({ 
            role: 'error', 
            text: 'Screen sharing is not supported on this mobile browser. Please try using Chrome on Android or a desktop browser.'
          });
      return;
    }
      }

      console.log("[Screen Share] Requesting screen capture access");
      
      // Use proper screen capture API with best compatibility
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          mediaSource: "screen",
          width: { ideal: 1280 }, 
          height: { ideal: 720 }
        },
        audio: false
      });
      
      screenStreamRef.current = stream;
      addLiveMessage({ role: 'system', text: 'Screen share access granted.' });

      // Ensure dedicated elements exist FOR SCREEN SHARE
      if (!screenVideoElementRef.current) {
        screenVideoElementRef.current = document.createElement('video');
        console.log('[Screen Share] Created screenVideoElementRef.');
      }
      screenVideoElementRef.current.setAttribute('playsinline', ''); 
      screenVideoElementRef.current.muted = true;
      
      if (!screenCanvasElementRef.current) {
        screenCanvasElementRef.current = document.createElement('canvas');
        console.log('[Screen Share] Created screenCanvasElementRef.');
      }

      const video = screenVideoElementRef.current;
      const canvas = screenCanvasElementRef.current;

      video.onloadedmetadata = () => {
        console.log("[Screen Share] Stream metadata loaded.");
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          console.log("[Screen Share] Aborting frame sending: WS closed.");
          screenStreamRef.current?.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
          setIsStreamingScreen(false); 
          isScreenSharingRef.current = false;
          return;
        }
        
        canvas.width = video.videoWidth; 
        canvas.height = video.videoHeight;
        console.log(`[Screen Share] Canvas resized to ${canvas.width}x${canvas.height}`);

        setIsStreamingScreen(true);
        isScreenSharingRef.current = true;
        addLiveMessage({ role: 'system', text: 'Screen share active. Sending frames.' });

        const sendScreenFrame = () => {
          if (!isScreenSharingRef.current || !ws || ws.readyState !== WebSocket.OPEN) {
            console.log(`[Screen Share] Stopping frame sending. Ref=${isScreenSharingRef.current}, wsState=${ws?.readyState}`);
            return;
          }

          try {
            const context = canvas.getContext('2d');
            if (video.readyState >= video.HAVE_CURRENT_DATA && canvas.width > 0 && canvas.height > 0) {
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              canvas.toBlob((blob) => {
                if (blob && isScreenSharingRef.current && ws?.readyState === WebSocket.OPEN) {
                  try {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      if (isScreenSharingRef.current && ws?.readyState === WebSocket.OPEN) {
                        const base64data = reader.result.split(',')[1];
                        const screenChunk = { mimeType: 'image/jpeg', data: base64data };
                        console.log(`[Screen Share] Sending screen frame chunk to backend.`);
                        ws.send(JSON.stringify({ type: 'screen_chunk', chunk: screenChunk }));
                        if (isScreenSharingRef.current) { setTimeout(sendScreenFrame, 1000); } // Slower rate for screen share
                      } else { console.log("[Screen Share] Loop terminated: Ref became false during blob read or WS closed."); }
                    };
                    reader.readAsDataURL(blob);
                  } catch (processingErr) {
                    console.error("[Screen Share] Error processing frame blob:", processingErr);
                    if (isScreenSharingRef.current) { setTimeout(sendScreenFrame, 1000); }
                  }
                } else if (!blob) {
                  console.warn("[Screen Share] canvas.toBlob produced null blob.");
                  if (isScreenSharingRef.current) { setTimeout(sendScreenFrame, 1000); }
                } else { console.log("[Screen Share] State changed (ref) or WS closed before blob processing. Loop terminates."); }
              }, 'image/jpeg', 0.7); // Slightly lower quality for screen share potentially
            } else {
              console.warn(`[Screen Share] Video element not ready or canvas not sized. Retrying.`);
              if (isScreenSharingRef.current) { setTimeout(sendScreenFrame, 1000); }
            }
          } catch (drawError) {
            console.error("[Screen Share] Error drawing screen frame:", drawError);
            if (isScreenSharingRef.current) { setTimeout(sendScreenFrame, 1000); }
          }
        };
        sendScreenFrame();
      };

      video.onerror = (err) => { 
        console.error("[Screen Share] Video element error:", err); 
        addLiveMessage({ 
          role: 'error', 
          text: `Screen share error: ${err.message || 'Unknown'}`
        }); 
        stopScreenShareInternal(); 
      };
      
      video.srcObject = stream;
      video.play().catch(err => { 
        console.error("[Screen Share] Error playing video:", err); 
        addLiveMessage({ 
          role: 'error', 
          text: `Screen share error: ${err.message}`
        }); 
        stopScreenShareInternal(); 
      });

      // Handle user ending screen share
      stream.getVideoTracks()[0].onended = () => {
        console.log("[Screen Share] User stopped sharing via browser UI.");
        stopScreenShareInternal();
      };

    } catch (error) {
      console.error("[Screen Share] Error:", error);
      
      let errorMessage = "Failed to start screen sharing";
      
      // Provide more specific error messages for mobile
      if (error.name === "NotAllowedError") {
        errorMessage = "Screen sharing permission denied";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Cannot access the screen content";
      } else if (error.name === "NotSupportedError" || error.message.includes("getDisplayMedia is not defined")) {
        errorMessage = "Screen sharing is not supported on this device or browser";
      } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        errorMessage = "iOS devices don't support screen sharing in browsers";
      } else {
        errorMessage = `Screen sharing error: ${error.message || 'Unknown error'}`;
      }
      
      addLiveMessage({ role: 'error', text: errorMessage });
      isScreenSharingRef.current = false;
    }
  }, [addLiveMessage, stopScreenShareInternal]);

  return {
    // State
    isStreamingScreen,
    
    // Functions
    startScreenShare: startScreenShareInternal,
    stopScreenShare: stopScreenShareInternal,
    
    // Refs
    screenStreamRef
  };
}; 