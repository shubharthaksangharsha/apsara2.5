import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, AudioLines } from 'lucide-react'; // Import icons

// Helper function to decode PCM audio data
const decodePcm16ToFloat32 = (arrayBuffer) => {
  const pcmData = new Int16Array(arrayBuffer);
  const floatData = new Float32Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    floatData[i] = pcmData[i] / 32768.0; // Normalize to [-1.0, 1.0]
  }
  return floatData;
};

export function useLiveSession({ currentVoice }) {
  // State
  const [liveMessages, setLiveMessages] = useState([]);
  const [liveConnectionStatus, setLiveConnectionStatus] = useState('disconnected');
  const [liveModality, setLiveModality] = useState('AUDIO');
  const [liveSystemInstruction, setLiveSystemInstruction] = useState('You are a helpful assistant.');
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isStreamingVideo, setIsStreamingVideo] = useState(false);
  const [isStreamingScreen, setIsStreamingScreen] = useState(false); // <-- New state for screen share
  const [audioError, setAudioError] = useState(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(null); // State for timer
  const [inputSampleRate] = useState(16000); // Target input sample rate for PCM
  const [videoDevices, setVideoDevices] = useState([]); // <-- New state for video devices
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState(null); // <-- New state for selected video device
  const [mapDisplayData, setMapDisplayData] = useState(null); // <-- New state for map data
  const [weatherUIData, setWeatherUIData] = useState(null); // <-- NEW: State for weather UI data
  const [calendarEvents, setCalendarEvents] = useState([]); // <-- NEW: State for calendar events
  const [calendarEventsLastUpdated, setCalendarEventsLastUpdated] = useState(0); // Use 0 as initial, can be a timestamp or counter

  // --- ADD a useEffect to log state changes for mapDisplayData ---
  useEffect(() => {
    console.log("[useLiveSession] mapDisplayData state changed:", mapDisplayData);
  }, [mapDisplayData]);
  // --- End Add ---

  // Refs
  const liveWsConnection = useRef(null);
  const audioContextRef = useRef(null); // For Playback (24kHz)
  const audioInputContextRef = useRef(null); // For Recording (16kHz)
  const scriptProcessorNodeRef = useRef(null); // For PCM capture
  const mediaStreamSourceRef = useRef(null); // Mic stream source
  const videoStreamRef = useRef(null); // Webcam stream
  const videoElementRef = useRef(null); // Hidden video element FOR WEBCAM
  const canvasElementRef = useRef(null); // Canvas for snapshotting FOR WEBCAM
  const audioQueueRef = useRef([]);
  const isPlayingAudioRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const liveStreamingTextRef = useRef('');
  const liveStreamingMsgIdRef = useRef(null);
  const sessionResumeHandleRef = useRef(null); // Ref to store the handle
  const isStreamingVideoRef = useRef(isStreamingVideo);
  const screenStreamRef = useRef(null); // <-- New ref for screen share stream
  const screenVideoElementRef = useRef(null); // <-- Hidden video element FOR SCREEN SHARE
  const screenCanvasElementRef = useRef(null); // <-- Canvas for snapshotting FOR SCREEN SHARE
  const isScreenSharingRef = useRef(isStreamingScreen); // <-- New ref for screen share status

  // --- Sync state to refs ---
  useEffect(() => {
    isStreamingVideoRef.current = isStreamingVideo;
  }, [isStreamingVideo]);

  useEffect(() => {
    isScreenSharingRef.current = isStreamingScreen; // <-- Sync screen share state
  }, [isStreamingScreen]);
  // --- End Sync ---

  // --- Memoized Utility Functions ---
  const addLiveMessage = useCallback((msg) => {
    // Clear map data when a new message (esp. user message) is added? Debatable.
    // setMapDisplayData(null); // Optional: Clear map on any new message
    console.log(`➕ Adding new message ID ${msg.id}, text: "${msg.text?.substring(0, 20)}..."`);
    setLiveMessages(prev => [...prev, { ...msg, id: msg.id || (Date.now() + Math.random() * 1000), timestamp: Date.now() }]);
  }, []);

  // --- MODIFIED updateLiveMessage ---
  const updateLiveMessage = useCallback((id, updates) => {
    setLiveMessages(prevMessages => {
      const index = prevMessages.findIndex(msg => msg.id === id);
      if (index === -1) {
        console.warn(`[Live WS] updateLiveMessage: Message with ID ${id} not found! Cannot update. Updates:`, updates);
        return prevMessages;
      }

      const updatedMessages = [...prevMessages];
      const currentMessage = updatedMessages[index];
      const updatedMessage = { ...currentMessage }; // Clone the message

      // Ensure parts array exists
      updatedMessage.parts = updatedMessage.parts ? [...updatedMessage.parts] : [];

      // Handle incoming text updates specifically for parts
      if (updates.text) {
          const lastPartIndex = updatedMessage.parts.length - 1;
          // Check if the last part is a text part and append to it
          if (lastPartIndex >= 0 && updatedMessage.parts[lastPartIndex].text !== undefined) {
              updatedMessage.parts[lastPartIndex] = {
                  ...updatedMessage.parts[lastPartIndex],
                  text: updatedMessage.parts[lastPartIndex].text + updates.text
              };
              console.log(`[Live WS] Appended text to last part of message ${id}`);
      } else {
              // If no parts, or last part isn't text, add a new text part
              updatedMessage.parts.push({ text: updates.text });
              console.log(`[Live WS] Added new text part to message ${id}`);
          }
          // Remove the top-level text property from updates as it's handled in parts
          delete updates.text;
      }

      // Handle incoming parts updates (like images, code blocks) - merge them
      if (updates.parts) {
          updatedMessage.parts = [...updatedMessage.parts, ...updates.parts];
           console.log(`[Live WS] Added ${updates.parts.length} new parts to message ${id}`);
          delete updates.parts; // Remove parts from general updates
      }

      // Apply any other remaining updates (e.g., metadata, though less common here)
        updatedMessages[index] = {
          ...updatedMessage,
          ...Object.fromEntries(Object.entries(updates).filter(([key]) => key !== 'id'))
        };

      return updatedMessages;
    });
  }, []);
  // --- END MODIFIED updateLiveMessage ---

  // --- NEW: Get Video Input Devices ---
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

  // --- Unified Message Update Logic (Handles potential multiple parts) ---
  // MODIFY this to use the corrected updateLiveMessage logic for text
  const addOrUpdateLiveModelMessagePart = useCallback((part) => {
      setLiveMessages(prevMessages => {
          const streamId = liveStreamingMsgIdRef.current;

          if (!streamId) { // Start new message if no streaming ID exists
              const newMsgId = Date.now() + Math.random() + '_live_model';
              liveStreamingMsgIdRef.current = newMsgId;
              console.log(`✨ Starting new model message (ID: ${newMsgId}) with part:`, part);
              // Ensure the first part is wrapped correctly
              return [...prevMessages, { role: 'model', parts: [part], id: newMsgId }];
          } else { // Append or update existing message
              const index = prevMessages.findIndex(msg => msg.id === streamId);
              if (index === -1) {
                  console.warn(`[Live WS] addOrUpdateLiveModelMessagePart: Message with ID ${streamId} not found. Starting new.`);
                   const newMsgId = Date.now() + Math.random() + '_live_model_fallback';
                   liveStreamingMsgIdRef.current = newMsgId;
                   return [...prevMessages, { role: 'model', parts: [part], id: newMsgId }];
              }

              const updatedMessages = [...prevMessages];
              const currentMessage = updatedMessages[index];
              const updatedMessage = { ...currentMessage };
              updatedMessage.parts = updatedMessage.parts ? [...updatedMessage.parts] : [];

              // If the incoming part is text, append to the last text part if possible
              if (part.text) {
                  const lastPartIndex = updatedMessage.parts.length - 1;
                   if (lastPartIndex >= 0 && updatedMessage.parts[lastPartIndex].text !== undefined) {
                       updatedMessage.parts[lastPartIndex] = {
                           ...updatedMessage.parts[lastPartIndex],
                           text: updatedMessage.parts[lastPartIndex].text + part.text
                       };
                       console.log(`➡️ Appended text part via addOrUpdate to message ${streamId}`);
                   } else {
                       updatedMessage.parts.push(part); // Add as new part if last wasn't text
                       console.log(`➡️ Added new text part via addOrUpdate to message ${streamId}`);
                   }
              } else {
                   // For non-text parts (images, code), just append
                   updatedMessage.parts.push(part);
                   console.log(`➡️ Added new non-text part via addOrUpdate to message ${streamId}:`, part);
              }

              updatedMessages[index] = updatedMessage;
              return updatedMessages;
          }
      });
  }, []);

  // --- Memoized Audio Context Management ---
  const initAudioContexts = useCallback(() => {
     if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        try {
            // Playback context remains 24kHz based on typical model output
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            console.log('[Audio Playback] Context initialized (24kHz):', audioContextRef.current.state);
            setAudioError(null);
         } catch (e) {
            console.error("[Audio Playback] Error creating Context:", e);
            setAudioError("Could not initialize audio playback.");
            audioContextRef.current = null;
        }
     }
     // Initialize separate Input context at 16kHz
     if (!audioInputContextRef.current || audioInputContextRef.current.state === 'closed') {
       try {
           audioInputContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: inputSampleRate });
           console.log(`[Audio Input] Context initialized (${inputSampleRate}Hz):`, audioInputContextRef.current.state);
       } catch (e) {
           console.error(`[Audio Input] Error creating ${inputSampleRate}Hz Context:`, e);
           setAudioError(`Could not initialize ${inputSampleRate}Hz audio input.`);
           audioInputContextRef.current = null;
       }
     }
  }, [inputSampleRate]); // Depends on the target sample rate

  const closeAudioContexts = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(e => console.error('[Audio] Error closing AudioContext:', e));
      console.log('[Audio] AudioContext closed.');
    }
    audioContextRef.current = null;
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;

    // Close input context and nodes
    if (audioInputContextRef.current && audioInputContextRef.current.state !== 'closed') {
      audioInputContextRef.current.close().catch(e => console.error('[Audio Input] Error closing context:', e));
      console.log('[Audio Input] Context closed.');
    }
    audioInputContextRef.current = null;
    scriptProcessorNodeRef.current?.disconnect();
    scriptProcessorNodeRef.current = null;
    mediaStreamSourceRef.current?.disconnect();
    mediaStreamSourceRef.current = null;

    stopVideoStreamInternal(); // Also stop video stream on general close
  }, []);

  // --- Memoized Audio Playback ---
   const playAudioQueue = useCallback(async () => {
     const audioContext = audioContextRef.current;
     if (!audioContext) return;

     if (audioContext.state === 'suspended') {
       try { await audioContext.resume(); } catch (e) {
         console.error('[Audio] Failed to resume:', e); setAudioError("Playback requires interaction."); isPlayingAudioRef.current = false; return;
       }
     }
     if (isPlayingAudioRef.current || audioQueueRef.current.length === 0 || audioContext.state !== 'running') return;
     isPlayingAudioRef.current = true;
     while (audioQueueRef.current.length > 0) {
       const arrayBuffer = audioQueueRef.current.shift();
       if (!arrayBuffer || arrayBuffer.byteLength === 0) continue;
       try {
         const float32Data = decodePcm16ToFloat32(arrayBuffer);
         const buffer = audioContext.createBuffer(1, float32Data.length, audioContext.sampleRate);
         buffer.copyToChannel(float32Data, 0);
         const source = audioContext.createBufferSource(); source.buffer = buffer; source.connect(audioContext.destination);
         await new Promise(resolve => { source.onended = resolve; source.start(0); });
       } catch (e) { console.error("[Audio] Playback error:", e); setAudioError("Error playing audio chunk."); }
     }
     isPlayingAudioRef.current = false;
   }, []); // decodePcm16ToFloat32 is stable

   // Function to stop current playback and clear queue
   const stopAndClearAudio = useCallback(() => {
        if (isPlayingAudioRef.current && audioContextRef.current && audioContextRef.current.state === 'running') {
            const source = audioContextRef.current.createBufferSource(); // Dummy source needed for stop in some envs?
            try {
                 // Attempt to stop the actual source if reference exists (might not be reliable across browsers)
                 // A more robust way is often just letting the queue empty after clearing.
            } catch (e) { console.warn("Error trying to explicitly stop audio source:", e); }
        }
        audioQueueRef.current = []; // Clear the queue
        isPlayingAudioRef.current = false; // Mark as not playing
        setIsModelSpeaking(false); // Update UI state
   }, []);

   // --- Memoized Recording Logic ---
   const stopRecordingInternal = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            // This block might become unused if fully switching to ScriptProcessor
            console.log('[Audio Input] Stopping MediaRecorder (if active).');
            addLiveMessage({ role: 'system', text: 'Recording stopped.' });
            try { mediaRecorderRef.current.stop(); }
            catch (e) { console.error("[Audio Input] Error stopping recorder:", e); }
            // onstop handles track cleanup
        } else if (isRecording && scriptProcessorNodeRef.current) {
            console.log('[Audio Input] Stopping PCM Recording internally.');
            addLiveMessage({ role: 'system', text: 'Recording stopped.' });
            scriptProcessorNodeRef.current?.disconnect(); // Disconnect processor
            scriptProcessorNodeRef.current = null;
            mediaStreamSourceRef.current?.disconnect(); // Disconnect source
            mediaStreamSourceRef.current?.mediaStream?.getTracks().forEach(track => track.stop()); // Stop mic tracks
            mediaStreamSourceRef.current = null;
        } else if (mediaStreamSourceRef.current?.mediaStream) { // Failsafe if state is weird
            // Ensure stream tracks stopped if state somehow got out of sync
            mediaStreamSourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false); // Ensure state is false
        mediaRecorderRef.current = null; // Clean up ref
   }, [isRecording, addLiveMessage]);

   const startRecordingInternal = useCallback(async () => {
        const ws = liveWsConnection.current;
        // Allow recording regardless of modality, just check connection state
        if (isRecording || !ws || ws.readyState !== WebSocket.OPEN || liveConnectionStatus !== 'connected') {
            console.warn(`Cannot start recording. State: isRecording=${isRecording}, ws=${ws?.readyState}, status=${liveConnectionStatus}`);
            return;
        }
        // Ensure input audio context is ready
        if (!audioInputContextRef.current || audioInputContextRef.current.state !== 'running') {
            console.error("Audio input context not ready for PCM capture.");
            addLiveMessage({ role: 'error', text: 'Audio input context not ready.' });
            // Attempt to resume it (might require user interaction)
            try { await audioInputContextRef.current?.resume(); } catch (e) {}
            if (audioInputContextRef.current?.state !== 'running') return; // Exit if still not running
        }

        addLiveMessage({ role: 'system', text: 'Starting recording (PCM)...' });
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            addLiveMessage({ role: 'system', text: 'Mic access granted.' });
            mediaStreamSourceRef.current = audioInputContextRef.current.createMediaStreamSource(stream);

            const bufferSize = 4096; // Common buffer size, power of 2
            scriptProcessorNodeRef.current = audioInputContextRef.current.createScriptProcessor(bufferSize, 1, 1); // 1 input, 1 output channel

            scriptProcessorNodeRef.current.onaudioprocess = (audioProcessingEvent) => {
                const inputBuffer = audioProcessingEvent.inputBuffer;
                const inputData = inputBuffer.getChannelData(0); // Float32 array

                // Convert Float32 to Int16 PCM
                const pcm16Data = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    let sample = Math.max(-1, Math.min(1, inputData[i])); // Clamp
                    pcm16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF; // Scale to Int16 range
                }

                if (ws?.readyState === WebSocket.OPEN) {
                    try {
                        // Send the raw PCM data (ArrayBuffer)
                        ws.send(pcm16Data.buffer);
                    } catch (sendErr) {
                        console.error("[Audio Input] Error sending PCM chunk:", sendErr);
                        addLiveMessage({ role: 'error', text: `Send error: ${sendErr.message}` });
                        stopRecordingInternal(); // Stop on send error
                    }
                } else if (ws?.readyState !== WebSocket.OPEN) {
                     console.warn("[Audio Input] WS closed during recording.");
                     stopRecordingInternal();
                }
            };

            // Connect the graph: Mic Source -> Script Processor -> Output Destination
            // The connection to destination is necessary for the processor to run in some browsers
            mediaStreamSourceRef.current.connect(scriptProcessorNodeRef.current);
            scriptProcessorNodeRef.current.connect(audioInputContextRef.current.destination);

            setIsRecording(true);
            addLiveMessage({ role: 'system', text: `Recording active (PCM @ ${inputSampleRate}Hz).` });

        } catch (err) {
            console.error('[Audio Input] Error starting recording:', err);
            let errorText = `Mic error: ${err.message}`;
            if (err.name === 'NotAllowedError') errorText = 'Mic permission denied.';
            else if (err.name === 'NotFoundError') errorText = 'No microphone found.';
            addLiveMessage({ role: 'error', text: errorText });
            setIsRecording(false);
        }
   }, [isRecording, liveConnectionStatus, addLiveMessage, stopRecordingInternal, inputSampleRate]);

  // --- Video Streaming Logic ---
  const stopVideoStreamInternal = useCallback(() => {
      // Use the Ref for the check
      if (!isStreamingVideoRef.current) {
          // console.log('[Video Stream] stopVideoStreamInternal called but ref is already false.');
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

  const startVideoStreamInternal = useCallback(async (deviceId = null) => {
      const ws = liveWsConnection.current;
      // Use ref for check
      if (isStreamingVideoRef.current || !ws || ws.readyState !== WebSocket.OPEN || liveConnectionStatus !== 'connected') {
          console.warn(`[Video Stream] Cannot start. Ref=${isStreamingVideoRef.current}, ws=${ws?.readyState}, status=${liveConnectionStatus}`);
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
              if (!liveWsConnection.current || liveWsConnection.current.readyState !== WebSocket.OPEN) {
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
                  if (!isStreamingVideoRef.current || !liveWsConnection.current || liveWsConnection.current.readyState !== WebSocket.OPEN) {
                      console.log(`[Video Stream] Stopping frame sending loop. Ref=${isStreamingVideoRef.current}, wsState=${liveWsConnection.current?.readyState}`);
                      return; // Exit the function, loop terminates
                  }

                  try {
              const context = canvas.getContext('2d');
              if (video.readyState >= video.HAVE_CURRENT_DATA && canvas.width > 0 && canvas.height > 0) {
                  context.drawImage(video, 0, 0, canvas.width, canvas.height);
                          canvas.toBlob((blob) => {
                              // Check Ref *again* before async blob processing completes
                              if (blob && isStreamingVideoRef.current && liveWsConnection.current?.readyState === WebSocket.OPEN) {
                          try {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                          // Final check using Ref
                                          if (isStreamingVideoRef.current && liveWsConnection.current?.readyState === WebSocket.OPEN) {
                                              const base64data = reader.result.split(',')[1];
                                      const videoChunk = { mimeType: 'image/jpeg', data: base64data };
                                              console.log(`[Video Stream] Sending frame chunk to backend.`);
                                              liveWsConnection.current.send(JSON.stringify({ type: 'video_chunk', chunk: videoChunk }));
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
  }, [liveConnectionStatus, addLiveMessage, stopVideoStreamInternal, selectedVideoDeviceId]); // Added selectedVideoDeviceId

  // --- Screen Streaming Logic ---
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

  const startScreenShareInternal = useCallback(async () => {
    const ws = liveWsConnection.current;
    if (isScreenSharingRef.current || !ws || ws.readyState !== WebSocket.OPEN || liveConnectionStatus !== 'connected') {
      console.warn(`[Screen Share] Cannot start. Ref=${isScreenSharingRef.current}, ws=${ws?.readyState}, status=${liveConnectionStatus}`);
      return;
    }
    addLiveMessage({ role: 'system', text: 'Requesting screen share...' });

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: "screen", width: { ideal: 1280 }, height: { ideal: 720 } }, // Added ideal dimensions
        audio: false // Typically screen share doesn't include tab audio by default for this use case
      });
      screenStreamRef.current = stream;
      addLiveMessage({ role: 'system', text: 'Screen share access granted.' });

      // Ensure dedicated elements exist FOR SCREEN SHARE
      if (!screenVideoElementRef.current) {
        screenVideoElementRef.current = document.createElement('video');
        console.log('[Screen Share] Created screenVideoElementRef.');
      }
      screenVideoElementRef.current.setAttribute('playsinline', ''); screenVideoElementRef.current.muted = true;
      if (!screenCanvasElementRef.current) {
        screenCanvasElementRef.current = document.createElement('canvas');
        console.log('[Screen Share] Created screenCanvasElementRef.');
      }

      const video = screenVideoElementRef.current; // Use screen-specific video element
      const canvas = screenCanvasElementRef.current; // Use screen-specific canvas element

      video.onloadedmetadata = () => {
        console.log("[Screen Share] Stream metadata loaded.");
        if (!liveWsConnection.current || liveWsConnection.current.readyState !== WebSocket.OPEN) {
          console.log("[Screen Share] Aborting frame sending: WS closed.");
          screenStreamRef.current?.getTracks().forEach(track => track.stop()); screenStreamRef.current = null;
          setIsStreamingScreen(false); isScreenSharingRef.current = false;
          return;
        }
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        console.log(`[Screen Share] Canvas resized to ${canvas.width}x${canvas.height}`);

        setIsStreamingScreen(true);
        isScreenSharingRef.current = true;
        addLiveMessage({ role: 'system', text: 'Screen share active. Sending frames.' });

        const sendScreenFrame = () => {
          if (!isScreenSharingRef.current || !liveWsConnection.current || liveWsConnection.current.readyState !== WebSocket.OPEN) {
            console.log(`[Screen Share] Stopping frame sending. Ref=${isScreenSharingRef.current}, wsState=${liveWsConnection.current?.readyState}`);
            return;
          }

          try {
            const context = canvas.getContext('2d');
            if (video.readyState >= video.HAVE_CURRENT_DATA && canvas.width > 0 && canvas.height > 0) {
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              canvas.toBlob((blob) => {
                if (blob && isScreenSharingRef.current && liveWsConnection.current?.readyState === WebSocket.OPEN) {
                  try {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      if (isScreenSharingRef.current && liveWsConnection.current?.readyState === WebSocket.OPEN) {
                        const base64data = reader.result.split(',')[1];
                        const screenChunk = { mimeType: 'image/jpeg', data: base64data };
                        console.log(`[Screen Share] Sending screen frame chunk to backend.`);
                        liveWsConnection.current.send(JSON.stringify({ type: 'screen_chunk', chunk: screenChunk }));
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

      video.onerror = (err) => { console.error("[Screen Share] Video element error (for processing):", err); addLiveMessage({ role: 'error', text: `Screen share processing error: ${err.message || 'Unknown'}`}); stopScreenShareInternal(); };
      video.srcObject = stream; // Assign the screen share stream to the screen-specific processing video element
      video.play().catch(err => { console.error("[Screen Share] Error playing processing video:", err); addLiveMessage({ role: 'error', text: `Screen share playback error: ${err.message}`}); stopScreenShareInternal(); });

      // Handle when the user stops sharing via the browser's native UI
      stream.getVideoTracks()[0].onended = () => {
        console.log("[Screen Share] User stopped sharing via browser UI.");
        stopScreenShareInternal(); // Call our internal stop function
      };


    } catch (err) {
      console.error('[Screen Share] Error starting screen share:', err);
      let errorText = `Screen share error: ${err.message}`;
      if (err.name === 'NotAllowedError') errorText = 'Screen share permission denied.';
      // ... other specific errors for getDisplayMedia if needed
      addLiveMessage({ role: 'error', text: errorText });
      // Ensure state is reset
      setIsStreamingScreen(false);
      isScreenSharingRef.current = false;
      if(screenStreamRef.current) { // If stream was partially acquired
           screenStreamRef.current.getTracks().forEach(track => track.stop());
           screenStreamRef.current = null;
      }
    }
  }, [liveConnectionStatus, addLiveMessage, stopScreenShareInternal ]);

  // --- Memoized WebSocket Logic ---
  const setupLiveConnection = useCallback(() => {
    if (liveWsConnection.current) {
      console.warn("[Live Setup] Closing previous connection before starting new.");
      liveWsConnection.current.close(1000, "Starting new session");
      liveWsConnection.current = null; // Clear ref immediately
    }

    setLiveConnectionStatus('connecting');
    setLiveMessages([]);
    addLiveMessage({ role: 'system', text: 'Preparing live session...' });
    liveStreamingTextRef.current = ''; liveStreamingMsgIdRef.current = null;
    setAudioError(null);
    setMapDisplayData(null); // Clear map data
    setWeatherUIData(null); // <-- NEW: Clear weather data
    setCalendarEvents([]); // <-- NEW: Clear calendar events
    setCalendarEventsLastUpdated(0); // Reset on new connection

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const params = new URLSearchParams({ modalities: liveModality });
    if (liveModality === 'AUDIO' && currentVoice) params.append('voice', currentVoice);
    if (liveSystemInstruction?.trim()) params.append('systemInstruction', liveSystemInstruction.trim());
    if (sessionResumeHandleRef.current) params.append('resumeHandle', sessionResumeHandleRef.current); // Add handle if exists
    const wsUrl = `${protocol}//${window.location.host}/live?${params.toString()}`;

    console.log(`[Live Setup] Connecting: ${wsUrl}`);
    addLiveMessage({ role: 'system', text: `Initiating connection (${liveModality})...` });

    const ws = new WebSocket(wsUrl);
    liveWsConnection.current = ws;

    ws.onopen = () => {
      console.log('[Live WS] Browser-Backend WS Connection established.');
      addLiveMessage({ role: 'system', text: 'Browser-Backend WS connected. Waiting for AI...' });
    };

    ws.onmessage = (event) => {
        // Directly process event.data, assuming each message event contains one JSON object
        console.log('[Live WS] Received raw data:', event.data); // Log raw receive

        if (!event.data) {
            console.warn('[Live WS] Received empty message data.');
            return;
        }

        try {
          const data = JSON.parse(event.data);
          console.log('[Live WS] Successfully parsed data:', data);

          let turnOrGenComplete = false; // Flag to check if completion happened

          // --- Process Events FIRST (Including our new map event) ---
          if (data.event === 'map_display_update') {
              console.log("🗺️ [Live WS - useLiveSession] Received 'map_display_update'. Data:", data.mapData);
              setMapDisplayData(data.mapData); // Update map state
          } else if (data.event === 'backend_connected') {
                console.log("🔵 [Live WS] Processing 'backend_connected'.");
                addLiveMessage({ role: 'system', text: 'Backend ready. AI connection pending.' });
            } else if (data.event === 'connected') {
                console.log("✅ [Live WS] Processing 'connected'. Updating state...");
                addLiveMessage({ role: 'system', text: 'Live AI connection active.' });
                setLiveConnectionStatus('connected');
                console.log("✅ [Live WS] State update called for 'connected'.");
            } else if (data.event === 'error') {
                 console.error("🔴 [Live WS] Processing 'error':", data.message);
                 addLiveMessage({ role: 'error', text: `Error: ${data.message || 'Unknown'}` });
                 setLiveConnectionStatus('error');
                 if (isRecording) stopRecordingInternal();
                 setIsModelSpeaking(false); liveStreamingTextRef.current = ''; liveStreamingMsgIdRef.current = null;
             } else if (data.event === 'closed') {
                 console.log("⚪️ [Live WS] Processing 'closed':", data.code);
                 addLiveMessage({ role: 'system', text: `AI connection closed (${data.code || 'N/A'}).` });
            }
            // --- Process serverContent ---
            else if (data.serverContent) {
                 console.log("ℹ️ [Live WS] Processing 'serverContent'.");

                 // -- Handle Model Turn Parts (Text/Audio) --
                 if (data.serverContent.modelTurn?.parts) {
                     console.log("💬 [Live WS] Processing modelTurn parts.");
                     let isAudioChunk = false;
                     data.serverContent.modelTurn.parts.forEach(part => {
                         // --- Use the unified addOrUpdate function ---
                         addOrUpdateLiveModelMessagePart(part); // This now handles text aggregation correctly

                         // Handle Audio separately for playback (only if modality allows)
                         if (part.inlineData?.mimeType?.startsWith('audio/')) {
                              isAudioChunk = true;
                              if (liveModality === 'AUDIO') {
                                   if (!isModelSpeaking) setIsModelSpeaking(true);
                                   if (!audioContextRef.current) initAudioContexts();
                                   if (audioContextRef.current?.state === 'running') {
                                        try { const bs = window.atob(part.inlineData.data); const len = bs.length; const bytes = new Uint8Array(len); for (let i = 0; i < len; i++) bytes[i] = bs.charCodeAt(i); audioQueueRef.current.push(bytes.buffer); playAudioQueue(); }
                                        catch (e) { console.error("[Audio] Decode/Queue Error:", e); setAudioError("Audio processing error."); }
                                   } else if (audioContextRef.current?.state !== 'closed') { console.warn('[Audio] Context not running, skipping queue.'); }
                                   else { setAudioError("Audio context closed."); }
                              }
                         } else if (part.inlineData?.mimeType?.startsWith('image/')) {
                                // --- Handle Inline Image ---
                                addOrUpdateLiveModelMessagePart({ inlineData: part.inlineData });
                         }
                         // --- Handle Code Execution Parts ---
                         else if (part.executableCode) {
                              // Add executable code as a part
                              addOrUpdateLiveModelMessagePart({ executableCode: part.executableCode });
                          } else if (part.codeExecutionResult) {
                              // Add code result as a part
                              addOrUpdateLiveModelMessagePart({ codeExecutionResult: part.codeExecutionResult });
                          }
                     });
                     // Reset speaking indicator only if audio was playing this turn
                     if (data.serverContent.turnComplete || data.serverContent.generationComplete) {
                          if (isModelSpeaking && isAudioChunk) setIsModelSpeaking(false);
                     }
                 } // end if modelTurn.parts

                 // -- Handle Turn/Generation Completion --
                 if (data.serverContent.turnComplete || data.serverContent.generationComplete) {
                      console.log("🏁 [Live WS] Turn/Generation Complete detected.");
                      turnOrGenComplete = true;
                 }

                 // --- Handle Interruption ---
                 if (data.serverContent.interrupted) {
                    console.log("🛑 [Live WS] Interruption detected! Stopping playback.");
                    stopAndClearAudio(); // Stop playback and clear queue
                 }

            } // end if data.serverContent

            // --- Process Other Top-Level Events ---
            else if (data.setupComplete) {
                 console.log("✅ [Live WS] Processing 'setupComplete'.");
            } else if (data.serverToolCall) {
                 console.log("🔧 [Live WS] Processing 'serverToolCall'.");
                 addLiveMessage({ role: 'system', text: `Tool call: ${data.serverToolCall.functionCalls?.[0]?.name || '?'}` });
            }
            // --- Store Session Resumption Handle ---
            else if (data.sessionResumptionUpdate) {
                 console.log("💾 [Live WS] Processing 'sessionResumptionUpdate'.");
                 if (data.sessionResumptionUpdate.newHandle) {
                     sessionResumeHandleRef.current = data.sessionResumptionUpdate.newHandle;
                     console.log("[Live WS] Stored new session resume handle.");
                 }
            }
            // --- Handle Tool Call Notifications ---
            else if (data.event === 'tool_call_started') {
                 console.log("🛠️ [Live WS] Tool call started:", data.calls);
                 // Add a system message for each tool call started
                 data.calls?.forEach(call => addLiveMessage({ role: 'system', text: `⏳ Using tool: ${call.name}...`}));
            } else if (data.event === 'tool_call_result') {
                 console.log("✅ [Live WS] Tool call result:", data.name, data.result);
                 addLiveMessage({ role: 'system', text: `✅ Tool ${data.name} result: ${JSON.stringify(data.result)}`});
                if (data.name === 'getWeather' && data.result?._weatherGUIData) {
                    console.log("🌦️ [Live WS - useLiveSession] Received weather GUI data:", data.result._weatherGUIData);
                    setWeatherUIData(data.result._weatherGUIData);
                }
                if (data.name === 'listCalendarEvents' && data.result?.status === 'success' && Array.isArray(data.result.events)) {
                    console.log("🗓️ [Live WS - useLiveSession] Received calendar events:", data.result.events);
                    setCalendarEvents(data.result.events);
                    setCalendarEventsLastUpdated(Date.now());
                } else if (data.name === 'listCalendarEvents' && data.result?.status !== 'success') {
                    addLiveMessage({ role: 'error', text: `Error fetching calendar events: ${data.result?.message || 'Unknown error'}` });
                    setCalendarEvents([]);
                }
                // --- NEW: Handle createCalendarEvent success and refresh list ---
                if (data.name === 'createCalendarEvent' && data.result?.status === 'success') {
                    addLiveMessage({ role: 'system', text: `🎉 Event "${data.result.summary || 'New Event'}" created successfully! Refreshing calendar...` });
                    // Trigger a refresh of the calendar events list
                    if (liveWsConnection.current && liveWsConnection.current.readyState === WebSocket.OPEN) {
                        // Send a command to list events again
                        // Using sendLiveMessageText which also clears weather/map data
                        sendLiveMessageText("list my upcoming calendar events");
                    }
                } else if (data.name === 'createCalendarEvent' && data.result?.status !== 'success') {
                     addLiveMessage({ role: 'error', text: `Error creating event: ${data.result?.message || 'Unknown error'}` });
                }
                // --- End NEW ---
            } else if (data.event === 'tool_call_error') {
                 console.error("❌ [Live WS] Tool call error:", data.name, data.error);
                 addLiveMessage({ role: 'error', text: `❌ Tool ${data.name} error: ${data.error}`});
            }
            // --- Handle Transcription Events ---
            else if (data.inputTranscription) {
                 if (data.inputTranscription.text) {
                     addLiveMessage({ role: 'system', text: `🎤 You: ${data.inputTranscription.text}`, icon: Mic });
                 }
            } else if (data.outputTranscription) {
                if (data.outputTranscription.text) {
                    // Maybe less verbose for output? Or use a different icon?
                    addLiveMessage({ role: 'system', text: `🔊 AI: ${data.outputTranscription.text}`, icon: AudioLines });
                }
            }
            // --- Recognize Original Google Tool Call Message (Forwarded by Backend) ---
            else if (data.toolCall) {
                 // Backend already sent 'tool_call_started'. We just need to recognize this original message
                 // to prevent the "Unhandled" warning. Log it differently if needed for deep debug.
                 console.log("📞 [Live WS] Received original toolCall message structure (handled).");
            } else if (data.goAway?.timeLeft) { // Handle GoAway for timer
                 setSessionTimeLeft(data.goAway.timeLeft);
            }
            // --- Catch Unhandled Structures ---
            else if (!data.event) { // Only warn if it's not one of the handled 'event' types
                console.warn('[Live WS] Received unhandled message structure:', data);
                addLiveMessage({role: 'system', text: `(Debug: Unhandled msg ${JSON.stringify(data).substring(0, 50)}...)`}); // Optional: show in UI
            }

            // --- Reset Streaming Refs on Completion ---
            if (turnOrGenComplete) {
                console.log("🔄 [Live WS] Resetting text streaming refs.");
                liveStreamingTextRef.current = '';
                liveStreamingMsgIdRef.current = null;
            }

        } catch (err) {
            console.error('[Live WS] JSON Parse Error or Processing Error:', err, 'Raw data:', event.data);
            addLiveMessage({ role: 'error', text: `Frontend error: ${err.message}` });
        }
    }; // end ws.onmessage

    ws.onerror = (errorEvent) => {
      console.error('[Live WS] WebSocket error event:', errorEvent);
      addLiveMessage({ role: 'error', text: 'WebSocket connection error.' });
      setLiveConnectionStatus('error');
      setSessionTimeLeft(null); // Reset timer on error
      setMapDisplayData(null); // Clear map on error
      setWeatherUIData(null); // <-- NEW: Clear weather data on error
      setCalendarEvents([]); // <-- NEW: Clear calendar events on error
      setCalendarEventsLastUpdated(0); // Reset
    };

    ws.onclose = (event) => {
      console.log(`[Live WS] Connection closed. Code: ${event.code}, Clean: ${event.wasClean}, Reason: ${event.reason}`);
      setLiveConnectionStatus(prev => prev === 'error' ? 'error' : 'disconnected');
      if (!event.wasClean && event.code !== 1000) { addLiveMessage({ role: 'system', text: `Connection lost (Code: ${event.code}).` }); }
      liveWsConnection.current = null; // Clear the ref
      closeAudioContexts(); // Close both contexts
      if (isRecording) stopRecordingInternal();
      setIsModelSpeaking(false); liveStreamingTextRef.current = ''; liveStreamingMsgIdRef.current = null;
      setSessionTimeLeft(null); // Reset timer on close
      setMapDisplayData(null); // Clear map on close
      setWeatherUIData(null); // <-- NEW: Clear weather data on close
      setCalendarEvents([]); // <-- NEW: Clear calendar events on close
      setCalendarEventsLastUpdated(0); // Reset
    };
  }, [ liveModality, currentVoice, liveSystemInstruction, addLiveMessage, updateLiveMessage, addOrUpdateLiveModelMessagePart, initAudioContexts, playAudioQueue, closeAudioContexts, isRecording, stopRecordingInternal]); // Adjusted dependencies

  // --- Memoized Public Handlers ---
  const startLiveSession = useCallback(() => {
      setMapDisplayData(null); // Clear map when starting
      setWeatherUIData(null); // <-- NEW: Clear weather data when starting new session
      setCalendarEvents([]); // <-- NEW: Clear calendar events when starting new session
      setCalendarEventsLastUpdated(0); // Reset
      initAudioContexts();
      setupLiveConnection();
  }, [liveModality, initAudioContexts, setupLiveConnection]);

  const endLiveSession = useCallback(() => {
    setMapDisplayData(null); // Clear map when ending
    setWeatherUIData(null); // <-- NEW: Clear weather data
    setCalendarEvents([]); // <-- NEW: Clear calendar events
    setCalendarEventsLastUpdated(0); // Reset
    if (liveWsConnection.current) {
        addLiveMessage({ role: 'system', text: 'Ending session...' });
        liveWsConnection.current.close(1000, "User ended session"); // Normal closure
        // onclose handles the rest
    } else {
        // Already closed or never started, ensure clean state
        setLiveConnectionStatus('disconnected');
        closeAudioContexts(); // Close both
        setIsModelSpeaking(false);
        if(isRecording) stopRecordingInternal(); // Ensure recording state is reset
        stopVideoStreamInternal(); // Stop video when session ends
    }
  }, [addLiveMessage, closeAudioContexts, isRecording, stopRecordingInternal, stopVideoStreamInternal]); // Adjusted dependency

  const sendLiveMessageText = useCallback((text) => {
    setMapDisplayData(null); // Clear map display when user sends a new text message
    setWeatherUIData(null); // <-- NEW: Clear weather data when user sends a new message
    const ws = liveWsConnection.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !text.trim()) {
        console.warn("Cannot send live message, WS not ready or text empty."); return;
    }
    try {
        // Send as a structured message for backend differentiation
        const messagePayload = JSON.stringify({ type: 'text', text: text.trim() });
        ws.send(messagePayload);
        addLiveMessage({ role: 'user', text: text });
    } catch (e) {
        console.error('[Live WS] Send Error:', e); addLiveMessage({ role: 'error', text: `Send error: ${e.message}`});
    }
  }, [addLiveMessage]);

  // Expose stable recording controls
  const startRecording = useCallback(async () => {
        // Attempt to resume context on user interaction (clicking record)
        if (audioInputContextRef.current && audioInputContextRef.current.state === 'suspended') {
             console.log("[Audio Input] Attempting to resume context before starting recording...");
             try { await audioInputContextRef.current.resume(); }
             catch (e) { console.error("[Audio Input] Failed to resume context on record click:", e); }
        }
        await startRecordingInternal(); // Now call the internal function
  }, [startRecordingInternal]);

  const stopRecording = useCallback(() => {
      // Optional: Clear map when user stops recording? Maybe not needed.
      // setMapDisplayData(null);
      stopRecordingInternal()
  }, [stopRecordingInternal]);

  // --- Cleanup Effect ---
  useEffect(() => {
      // This effect runs only once on mount and returns a cleanup function for unmount
      return () => {
          console.log("[Live Hook] Unmounting - ensuring session cleanup.");
          if (liveWsConnection.current) {
              liveWsConnection.current.close(1000, "Component unmounting");
              liveWsConnection.current = null; // Clear ref on unmount
          }
          closeAudioContexts(); // Close both audio contexts on unmount
          // Clean up video/canvas elements if they were created
          if (videoElementRef.current) {
              videoElementRef.current.remove(); // Remove from DOM if they were ever appended (they are not currently)
              videoElementRef.current = null;
          }
          if (canvasElementRef.current) {
              canvasElementRef.current.remove();
              canvasElementRef.current = null;
          }
          if (screenVideoElementRef.current) {
              screenVideoElementRef.current.remove();
              screenVideoElementRef.current = null;
          }
          if (screenCanvasElementRef.current) {
              screenCanvasElementRef.current.remove();
              screenCanvasElementRef.current = null;
          }
      };
  }, [closeAudioContexts]); // Adjusted dependency

  return {
    // State
    liveMessages, liveConnectionStatus, liveModality, isModelSpeaking, isRecording, isStreamingVideo, audioError, sessionTimeLeft,
    liveSystemInstruction, // Keep original name for App.jsx prop clarity if preferred
    mediaStream: videoStreamRef.current,
    isStreamingScreen, // <-- New state
    screenStream: screenStreamRef.current, // <-- New stream for screen share display
    videoDevices, // <-- New: expose video devices
    selectedVideoDeviceId, // <-- New: expose selected video device ID
    mapDisplayData, // <-- Expose map data state
    weatherUIData, // <-- NEW: Expose weather UI data
    calendarEvents, // <-- NEW: Expose calendar events
    calendarEventsLastUpdated, // Expose this new state

    // Setters/Handlers
    setLiveModality,
    setLiveSystemInstruction, // Keep original name
    setSelectedVideoDeviceId, // <-- New: expose setter for selected video device
    getVideoInputDevices, // <-- New: expose function to get video devices
    setMapDisplayData, // <-- Expose map data setter if needed externally (maybe not)
    startLiveSession, endLiveSession, sendLiveMessage: sendLiveMessageText,
    startRecording, stopRecording,
    startVideoStream: startVideoStreamInternal, stopVideoStream: stopVideoStreamInternal, // Expose video handlers
    startScreenShare: startScreenShareInternal, // <-- New handler
    stopScreenShare: stopScreenShareInternal,   // <-- New handler
  };
}
