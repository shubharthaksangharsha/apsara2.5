import { useState, useRef, useCallback, useEffect } from 'react';

export const useVideo = ({ addLiveMessage }) => {
  // State
  const [isStreamingVideo, setIsStreamingVideo] = useState(false);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState(null);

  // Refs
  const videoStreamRef = useRef(null);
  const videoElementRef = useRef(null);
  const canvasElementRef = useRef(null);
  const isStreamingVideoRef = useRef(isStreamingVideo);

  // --- Sync state to refs ---
  useEffect(() => {
    isStreamingVideoRef.current = isStreamingVideo;
  }, [isStreamingVideo]);

  // --- Video Device Management ---
  const getVideoInputDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn("enumerateDevices() not supported.");
        addLiveMessage({ role: 'system', text: 'Camera enumeration not supported by this browser.' });
        setVideoDevices([]);
        return [];
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      setVideoDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedVideoDeviceId) {
        // setSelectedVideoDeviceId(videoInputs[0].deviceId); // Optionally select the first one by default
      }
      console.log('[Video Devices] Found video inputs:', videoInputs);
      return videoInputs;
    } catch (err) {
      console.error('[Video Devices] Error enumerating devices:', err);
      addLiveMessage({ role: 'error', text: `Error listing cameras: ${err.message}` });
      setVideoDevices([]);
      return [];
    }
  }, [addLiveMessage, selectedVideoDeviceId]);

  // --- Video Streaming Logic ---
  const stopVideoStreamInternal = useCallback(() => {
    // Use the Ref for the check
    if (!isStreamingVideoRef.current) {
        return;
    }

    console.log('[Video Stream] Stopping video stream internally.');
    addLiveMessage({ role: 'system', text: 'Video stream stopped.' });

    // Update state and ref *first*
    setIsStreamingVideo(false);
    isStreamingVideoRef.current = false;

    // Stop media tracks
    videoStreamRef.current?.getTracks().forEach(track => {
        track.stop();
        console.log(`[Video Stream] Stopped track: ${track.label || track.id}`);
    });
    videoStreamRef.current = null;

    // Clean up video element source
    if (videoElementRef.current) {
        videoElementRef.current.pause();
        videoElementRef.current.srcObject = null;
        videoElementRef.current.onloadedmetadata = null;
        videoElementRef.current.onerror = null;
        console.log('[Video Stream] Detached stream and cleaned up video element listeners for webcam.');
    }
    // No need to destroy the videoElementRef itself, it can be reused.
  }, [addLiveMessage]);

  const startVideoStreamInternal = useCallback(async (ws, connectionStatus, deviceId = null) => {
    // Use ref for check
    if (isStreamingVideoRef.current || !ws || ws.readyState !== WebSocket.OPEN || connectionStatus !== 'connected') {
        console.warn(`[Video Stream] Cannot start. Ref=${isStreamingVideoRef.current}, ws=${ws?.readyState}, status=${connectionStatus}`);
        return;
    }
    addLiveMessage({ role: 'system', text: 'Requesting video stream...' });

    const videoConstraints = {
      width: 320,
      height: 240
    };

    const finalDeviceId = deviceId || selectedVideoDeviceId; // Use passed deviceId, then selected, then default

    if (finalDeviceId) {
      videoConstraints.deviceId = { exact: finalDeviceId };
      console.log(`[Video Stream] Attempting to use specific camera: ${finalDeviceId}`);
    } else {
      console.log("[Video Stream] No specific camera selected, using default.");
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
        videoStreamRef.current = stream;
        const currentTrack = stream.getVideoTracks()[0];
        const currentDeviceLabel = currentTrack ? currentTrack.label : 'Unknown Camera';
        addLiveMessage({ role: 'system', text: `Webcam access granted (${currentDeviceLabel}).` });

        // Ensure elements exist FOR WEBCAM
        if (!videoElementRef.current) {
          videoElementRef.current = document.createElement('video');
          console.log('[Video Stream] Created videoElementRef for webcam.');
        }
        videoElementRef.current.setAttribute('playsinline', ''); videoElementRef.current.muted = true;
        if (!canvasElementRef.current) {
          canvasElementRef.current = document.createElement('canvas');
          console.log('[Video Stream] Created canvasElementRef for webcam.');
        }

        const video = videoElementRef.current;
        const canvas = canvasElementRef.current;

        video.onloadedmetadata = () => {
            console.log("[Video Stream] Video metadata loaded.");
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                console.log("[Video Stream] Aborting frame sending start because WS closed before metadata loaded.");
                videoStreamRef.current?.getTracks().forEach(track => track.stop()); videoStreamRef.current = null;
                setIsStreamingVideo(false); isStreamingVideoRef.current = false; // Sync state/ref
                return;
            }
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;

            // --- Update state AND ref right before starting loop ---
            console.log("[Video Stream] Setting state/ref to active and starting frame send.");
            setIsStreamingVideo(true);
            isStreamingVideoRef.current = true; // Sync Ref
            addLiveMessage({ role: 'system', text: 'Video stream active. Sending frames.' });

            // --- Frame Sending Loop ---
            const sendFrame = () => {
                // PRIMARY CHECK: Use the Ref
                if (!isStreamingVideoRef.current || !ws || ws.readyState !== WebSocket.OPEN) {
                    console.log(`[Video Stream] Stopping frame sending loop. Ref=${isStreamingVideoRef.current}, wsState=${ws?.readyState}`);
                    return; // Exit the function, loop terminates
                }

                try {
                    const context = canvas.getContext('2d');
                    if (video.readyState >= video.HAVE_CURRENT_DATA && canvas.width > 0 && canvas.height > 0) {
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                        canvas.toBlob((blob) => {
                            // Check Ref *again* before async blob processing completes
                            if (blob && isStreamingVideoRef.current && ws?.readyState === WebSocket.OPEN) {
                                try {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        // Final check using Ref
                                        if (isStreamingVideoRef.current && ws?.readyState === WebSocket.OPEN) {
                                            const base64data = reader.result.split(',')[1];
                                            const videoChunk = { mimeType: 'image/jpeg', data: base64data };
                                            console.log(`[Video Stream] Sending frame chunk to backend.`);
                                            ws.send(JSON.stringify({ type: 'video_chunk', chunk: videoChunk }));
                                            // --- Schedule the next frame *after* successful send ---
                                            // Check Ref before scheduling next call
                                            if (isStreamingVideoRef.current) {
                                                // console.log("[Video Stream] Scheduling next frame call.");
                                                setTimeout(sendFrame, 500); // Recursive call
                                            } else { console.log("[Video Stream] Loop terminated: Ref became false before scheduling next frame."); }
                                        } else { console.log("[Video Stream] State changed (ref) during blob read or WS closed. Loop terminates."); }
                                    };
                                    reader.readAsDataURL(blob);
                                } catch (processingErr) {
                                    console.error("[Video Stream] Error processing frame blob:", processingErr);
                                    // Check Ref before scheduling next call
                                    if (isStreamingVideoRef.current) { setTimeout(sendFrame, 500); }
                                }
                            } else if (!blob) {
                                console.warn("[Video Stream] canvas.toBlob produced null blob. Scheduling next frame.");
                                // Check Ref before scheduling next call
                                if (isStreamingVideoRef.current) { setTimeout(sendFrame, 500); }
                            } else { console.log("[Video Stream] State changed (ref) or WS closed before blob processing completed. Loop terminates."); }
                        }, 'image/jpeg', 0.8);
                    } else {
                        console.warn(`[Video Stream] Video not ready (readyState: ${video.readyState}) or canvas not sized (W:${canvas.width}, H:${canvas.height}). Scheduling next frame.`);
                        // Check Ref before scheduling next call
                        if (isStreamingVideoRef.current) { setTimeout(sendFrame, 500); }
                    }
                } catch (drawError) {
                    console.error("[Video Stream] Error drawing frame:", drawError);
                    // Check Ref before scheduling next call
                    if (isStreamingVideoRef.current) { setTimeout(sendFrame, 500); }
                }
            }; // --- End SendFrame definition ---
            sendFrame(); // Start the loop
        }; // --- End onloadedmetadata ---

        video.onerror = (err) => { console.error("[Video Stream] Video element error:", err); addLiveMessage({ role: 'error', text: `Video element error: ${err.message || 'Unknown'}`}); stopVideoStreamInternal(); };
        video.srcObject = stream;
        video.play().catch(err => { console.error("[Video Stream] Error starting video playback:", err); addLiveMessage({ role: 'error', text: `Video playback error: ${err.message}`}); stopVideoStreamInternal(); });
    } catch (err) {
         console.error('[Video Stream] Error starting video:', err);
         let errorText = `Webcam error: ${err.message}`;
         if (err.name === 'NotAllowedError') errorText = 'Webcam permission denied.';
         else if (err.name === 'NotFoundError') errorText = 'No webcam found.';
         else if (err.name === 'NotReadableError') errorText = 'Webcam is already in use or hardware error.';
         addLiveMessage({ role: 'error', text: errorText });
         stopVideoStreamInternal(); // Use the main cleanup function
    }
  }, [addLiveMessage, stopVideoStreamInternal, selectedVideoDeviceId]);

  // --- Camera Switching ---
  const flipCamera = useCallback(async (ws, connectionStatus) => {
    if (isStreamingVideo && videoDevices.length > 1) {
      try {
        // Find current device index
        const currentIndex = videoDevices.findIndex(device => device.deviceId === selectedVideoDeviceId);
        // Get next device (circular)
        const nextIndex = (currentIndex + 1) % videoDevices.length;
        const nextDeviceId = videoDevices[nextIndex].deviceId;
        
        // Stop current stream - use stopVideoStreamInternal instead of stopVideoStream
        stopVideoStreamInternal();
        
        // Short delay to ensure clean switch
        setTimeout(() => {
          // Start with new device
          setSelectedVideoDeviceId(nextDeviceId);
          startVideoStreamInternal(ws, connectionStatus, nextDeviceId);
        }, 300);
        
      } catch (error) {
        console.error("Error switching camera:", error);
        addLiveMessage({ role: 'error', text: `Camera switch error: ${error.message || 'Unknown error'}` });
      }
    }
  }, [isStreamingVideo, videoDevices, selectedVideoDeviceId, stopVideoStreamInternal, startVideoStreamInternal, addLiveMessage]);

  return {
    // State
    isStreamingVideo,
    videoDevices,
    selectedVideoDeviceId,
    
    // Functions
    setSelectedVideoDeviceId,
    getVideoInputDevices,
    startVideoStream: startVideoStreamInternal,
    stopVideoStream: stopVideoStreamInternal,
    flipCamera,
    
    // Refs
    videoStreamRef,
    videoElementRef,
    canvasElementRef
  };
}; 