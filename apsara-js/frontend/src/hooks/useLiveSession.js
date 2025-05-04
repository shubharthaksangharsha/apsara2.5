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
  const [isStreamingVideo, setIsStreamingVideo] = useState(false); // Video state
  const [audioError, setAudioError] = useState(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(null); // State for timer
  const [inputSampleRate] = useState(16000); // Target input sample rate for PCM

  // Refs
  const liveWsConnection = useRef(null);
  const audioContextRef = useRef(null); // For Playback (24kHz)
  const audioInputContextRef = useRef(null); // For Recording (16kHz)
  const scriptProcessorNodeRef = useRef(null); // For PCM capture
  const mediaStreamSourceRef = useRef(null); // Mic stream source
  const videoStreamRef = useRef(null); // Webcam stream
  const videoElementRef = useRef(null); // Hidden video element
  const canvasElementRef = useRef(null); // Canvas for snapshotting
  const audioQueueRef = useRef([]);
  const isPlayingAudioRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const liveStreamingTextRef = useRef('');
  const liveStreamingMsgIdRef = useRef(null);
  const sessionResumeHandleRef = useRef(null); // Ref to store the handle

  // --- Memoized Utility Functions ---
  const addLiveMessage = useCallback((msg) => {
    console.log(`➕ Adding new message ID ${msg.id}, text: "${msg.text?.substring(0, 20)}..."`);
    setLiveMessages(prev => [...prev, { ...msg, id: msg.id || (Date.now() + Math.random() * 1000), timestamp: Date.now() }]);
  }, []);

  const updateLiveMessage = useCallback((id, updates) => {
    setLiveMessages(prevMessages => {
      const index = prevMessages.findIndex(msg => msg.id === id);
      if (index === -1) {
        console.warn(`[Live WS] updateLiveMessage: Message with ID ${id} not found in prevMessages! Cannot update. Updates:`, updates);
        return prevMessages;
      }
      const updatedMessages = [...prevMessages];
      const currentMessage = updatedMessages[index];
      const existingParts = currentMessage.parts || [];

      if (updates.parts) {
        updatedMessages[index] = {
          ...currentMessage,
          parts: [...existingParts, ...updates.parts],
          ...Object.fromEntries(Object.entries(updates).filter(([key]) => key !== 'id' && key !== 'parts'))
        };
      } else {
        updatedMessages[index] = {
          ...currentMessage,
          ...Object.fromEntries(Object.entries(updates).filter(([key]) => key !== 'id' && key !== 'parts'))
        };
      }
      return updatedMessages;
    });
  }, []);

  // --- NEW: Unified Message Update Logic ---
  // This function handles adding/updating messages with potentially multiple parts
  const addOrUpdateLiveModelMessagePart = useCallback((part) => {
      setLiveMessages(prevMessages => {
          const streamId = liveStreamingMsgIdRef.current;
          if (!streamId) { // Start new message if no streaming ID exists
              const newMsgId = Date.now() + Math.random() + '_live_model';
              liveStreamingMsgIdRef.current = newMsgId;
              console.log(`✨ Starting new model message (ID: ${newMsgId}) with part:`, part);
              return [...prevMessages, { role: 'model', parts: [part], id: newMsgId }];
          } else { // Append part to existing message
              console.log(`➡️ Appending part to model message (ID: ${streamId}):`, part);
              return prevMessages.map(m =>
                  m.id === streamId ? { ...m, parts: [...(m.parts || []), part] } : m
              );
          }
      });
  }, []); // No dependencies needed here, relies on refs and state setter

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
      if (isStreamingVideo) {
          console.log('[Video Stream] Stopping video stream internally.');
          addLiveMessage({ role: 'system', text: 'Video stream stopped.' });
      }
      setIsStreamingVideo(false); // Set state first to stop send loop
      videoStreamRef.current?.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
       if (videoElementRef.current) {
          videoElementRef.current.srcObject = null;
          // Optionally remove elements if desired, or keep for reuse
          // videoElementRef.current.remove(); videoElementRef.current = null;
          // canvasElementRef.current.remove(); canvasElementRef.current = null;
       }
  }, [isStreamingVideo, addLiveMessage]); // Depends on isStreamingVideo state

  const startVideoStreamInternal = useCallback(async () => {
      const ws = liveWsConnection.current;
      if (isStreamingVideo || !ws || ws.readyState !== WebSocket.OPEN || liveConnectionStatus !== 'connected') {
          console.warn(`Cannot start video stream. State: isStreamingVideo=${isStreamingVideo}, ws=${ws?.readyState}, status=${liveConnectionStatus}`);
          return;
      }
      addLiveMessage({ role: 'system', text: 'Starting video stream...' });

      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } }); // Request video
          videoStreamRef.current = stream;
          addLiveMessage({ role: 'system', text: 'Webcam access granted.' });

          if (!videoElementRef.current) videoElementRef.current = document.createElement('video');
          videoElementRef.current.setAttribute('playsinline', ''); videoElementRef.current.muted = true;
          if (!canvasElementRef.current) canvasElementRef.current = document.createElement('canvas');

          videoElementRef.current.srcObject = stream;
          await videoElementRef.current.play();
          canvasElementRef.current.width = videoElementRef.current.videoWidth;
          canvasElementRef.current.height = videoElementRef.current.videoHeight;

          setIsStreamingVideo(true);
          addLiveMessage({ role: 'system', text: 'Video stream active.' });

          // --- Start sending frames periodically ---
          const sendFrame = () => {
              // Check if still streaming and WS is open
              if (!isStreamingVideo || ws?.readyState !== WebSocket.OPEN || !videoElementRef.current || !canvasElementRef.current) {
                   console.log("[Video Stream] Stopping frame sending loop.");
                   return; // Stop loop if state changes
              }
              const canvas = canvasElementRef.current;
              const video = videoElementRef.current;
              const context = canvas.getContext('2d');

              // Ensure video has data and canvas is sized
              if (video.readyState >= video.HAVE_CURRENT_DATA && canvas.width > 0 && canvas.height > 0) {
                  context.drawImage(video, 0, 0, canvas.width, canvas.height);
                  // Get blob from canvas
                  canvas.toBlob(async (blob) => {
                      if (blob && ws?.readyState === WebSocket.OPEN && isStreamingVideo) { // Double-check state again
                          try {
                              // Convert Blob to base64
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                   if (ws?.readyState === WebSocket.OPEN && isStreamingVideo) { // Final check
                                      const base64data = reader.result.split(',')[1]; // Get base64 part
                                      const videoChunk = { mimeType: 'image/jpeg', data: base64data };
                                      // Send structured message to backend
                                      ws.send(JSON.stringify({ type: 'video_chunk', chunk: videoChunk }));
                                   }
                              };
                              reader.readAsDataURL(blob);
                          } catch (sendErr) { console.error("[Video Stream] Error sending frame:", sendErr); }
                      }
                  }, 'image/jpeg', 0.8); // Send as JPEG, quality 80%
              }
              // Schedule next frame (only if still streaming)
              if (isStreamingVideo) {
                  setTimeout(sendFrame, 500); // Send roughly 2 frames per second
              }
          };
          sendFrame(); // Start the loop

      } catch (err) {
           console.error('[Video Stream] Error starting video:', err);
           let errorText = `Webcam error: ${err.message}`;
           if (err.name === 'NotAllowedError') errorText = 'Webcam permission denied.';
           else if (err.name === 'NotFoundError') errorText = 'No webcam found.';
           addLiveMessage({ role: 'error', text: errorText });
           setIsStreamingVideo(false); // Ensure state is false on error
           stopVideoStreamInternal(); // Clean up tracks if error occurred after getting stream
      }
  }, [isStreamingVideo, liveConnectionStatus, addLiveMessage, stopVideoStreamInternal]); // Added stopVideoStreamInternal dependency

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

          // --- Process Events FIRST ---
          if (data.event === 'backend_connected') {
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
                         if (part.text) {
                             // --- Aggregate Text (REVISED LOGIC) ---
                             if (!liveStreamingMsgIdRef.current) {
                                 // Start new message
                                 const newMsgId = Date.now() + Math.random() + '_live_model';
                                 liveStreamingMsgIdRef.current = newMsgId;
                                 liveStreamingTextRef.current = part.text; // Store initial text in ref
                                 addLiveMessage({ role: 'model', text: part.text, id: newMsgId }); // Add message with initial text
                             } else {
                                 // Append to existing
                                 const newlyAppendedText = part.text; // Text from this chunk
                                 const currentFullText = liveStreamingTextRef.current + newlyAppendedText; // Calculate new full text
                                 liveStreamingTextRef.current = currentFullText; // Update ref *before* state update
                                 updateLiveMessage(liveStreamingMsgIdRef.current, { text: currentFullText }); // Pass the calculated full text directly
                             }
                         } else if (part.inlineData?.mimeType?.startsWith('audio/')) {
                              // --- Handle Audio ---
                              isAudioChunk = true;
                              if (liveModality === 'AUDIO') {
                                   if (!isModelSpeaking) setIsModelSpeaking(true);
                                   if (!audioContextRef.current) initAudioContexts(); // Use the plural init
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
    };
  }, [ liveModality, currentVoice, liveSystemInstruction, addLiveMessage, updateLiveMessage, initAudioContexts, playAudioQueue, closeAudioContexts, isRecording, stopRecordingInternal]); // Adjusted dependencies

  // --- Memoized Public Handlers ---
  const startLiveSession = useCallback(() => {
      // **Simplified start:** Directly call setup. The setup function now handles closing existing connections.
      // Always initialize contexts regardless of modality selected for output
      initAudioContexts();
      setupLiveConnection();
  }, [liveModality, initAudioContexts, setupLiveConnection]);

  const endLiveSession = useCallback(() => {
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

  const stopRecording = useCallback(() => stopRecordingInternal(), [stopRecordingInternal]);

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
      };
  }, [closeAudioContexts]); // Adjusted dependency

  return {
    // State
    liveMessages, liveConnectionStatus, liveModality, isModelSpeaking, isRecording, isStreamingVideo, audioError, sessionTimeLeft,
    liveSystemInstruction, // Keep original name for App.jsx prop clarity if preferred

    // Setters/Handlers
    setLiveModality,
    setLiveSystemInstruction, // Keep original name
    startLiveSession, endLiveSession, sendLiveMessage: sendLiveMessageText,
    startRecording, stopRecording,
    startVideoStream: startVideoStreamInternal, stopVideoStream: stopVideoStreamInternal, // Expose video handlers
  };
}
