import { useState, useRef, useEffect, useCallback } from 'react';

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
  const [audioError, setAudioError] = useState(null);

  // Refs
  const liveWsConnection = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingAudioRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const liveStreamingTextRef = useRef('');
  const liveStreamingMsgIdRef = useRef(null);

  // --- Memoized Utility Functions ---
  const addLiveMessage = useCallback((msg) => {
    console.log(`➕ Adding new message ID ${msg.id}, text: "${msg.text?.substring(0, 20)}..."`);
    setLiveMessages(prev => [...prev, { ...msg, id: msg.id || (Date.now() + Math.random() * 1000), timestamp: Date.now() }]);
  }, []);

  const updateLiveMessage = useCallback((id, newText) => {
    setLiveMessages(prevMessages => {
      const messageExists = prevMessages.some(m => m.id === id);
      if (!messageExists) {
          console.warn(`❗️ updateLiveMessage: Message with ID ${id} not found in prevMessages! Cannot update.`);
          return prevMessages; // Return previous state if ID not found
      }
      console.log(`🔄 Updating message ID ${id}. Current text len: ${prevMessages.find(m => m.id === id)?.text?.length}. New text len: ${newText?.length}`);
      const updatedMessages = prevMessages.map(m =>
        m.id === id ? { ...m, text: newText } : m
      );
      // Optional: Verify update happened
      // const updatedText = updatedMessages.find(m => m.id === id)?.text;
      // if (updatedText !== newText) {
      //     console.warn(`❗️ Message text for ID ${id} did not update as expected.`);
      // }
      return updatedMessages;
    });
  }, []);

  // --- Memoized Audio Context Management ---
  const initAudioContext = useCallback(() => {
     if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        try {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            console.log('[Audio] AudioContext initialized:', audioContextRef.current.state);
            setAudioError(null);
         } catch (e) {
            console.error("[Audio] Error creating AudioContext:", e);
            setAudioError("Could not initialize audio playback.");
            audioContextRef.current = null;
        }
     }
  }, []);

  const closeAudioContext = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(e => console.error('[Audio] Error closing AudioContext:', e));
      console.log('[Audio] AudioContext closed.');
    }
    audioContextRef.current = null;
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
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

   // --- Memoized Recording Logic ---
   const stopRecordingInternal = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            console.log('[Audio Input] Stopping MediaRecorder internally.');
            addLiveMessage({ role: 'system', text: 'Recording stopped.' });
            try { mediaRecorderRef.current.stop(); }
            catch (e) { console.error("[Audio Input] Error stopping recorder:", e); }
            // onstop handles track cleanup
        } else if (mediaRecorderRef.current?.stream) {
            // Ensure stream tracks stopped if state somehow got out of sync
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false); // Ensure state is false
        mediaRecorderRef.current = null; // Clean up ref
   }, [isRecording, addLiveMessage]); // Depends on isRecording state and addLiveMessage callback

   const startRecordingInternal = useCallback(async () => {
        const ws = liveWsConnection.current;
        if (isRecording || !ws || ws.readyState !== WebSocket.OPEN || liveConnectionStatus !== 'connected') {
            console.warn(`Cannot start recording. State: isRecording=${isRecording}, ws=${ws?.readyState}, status=${liveConnectionStatus}`);
            return;
        }
        addLiveMessage({ role: 'system', text: 'Starting recording...' });
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            addLiveMessage({ role: 'system', text: 'Mic access granted.' });
            const options = { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '' };
            if (!options.mimeType) addLiveMessage({ role: 'error', text: 'Opus codec not supported.' });

            const recorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = recorder; // Store ref

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0 && ws?.readyState === WebSocket.OPEN) {
                    try { ws.send(event.data); }
                    catch (sendErr) {
                        console.error("[Audio Input] Error sending chunk:", sendErr);
                        addLiveMessage({ role: 'error', text: `Send error: ${sendErr.message}` });
                        stopRecordingInternal(); // Stop on send error
                    }
                } else if (ws?.readyState !== WebSocket.OPEN) {
                     console.warn("[Audio Input] WS closed during recording.");
                     stopRecordingInternal();
                }
            };
            recorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                console.log('[Audio Input] MediaRecorder stopped.');
                // Don't set isRecording false here, let stopRecordingInternal handle it
            };
            recorder.onerror = (event) => {
                console.error('[Audio Input] MediaRecorder error:', event.error);
                addLiveMessage({ role: 'error', text: `Recorder error: ${event.error.name}` });
                setIsRecording(false); // Update state on error
            };

            recorder.start(250);
            setIsRecording(true);
            addLiveMessage({ role: 'system', text: 'Recording active.' });
        } catch (err) {
            console.error('[Audio Input] Error starting recording:', err);
            let errorText = `Mic error: ${err.message}`;
            if (err.name === 'NotAllowedError') errorText = 'Mic permission denied.';
            else if (err.name === 'NotFoundError') errorText = 'No microphone found.';
            addLiveMessage({ role: 'error', text: errorText });
            setIsRecording(false);
        }
   }, [isRecording, liveConnectionStatus, addLiveMessage, stopRecordingInternal]); // Depends on state and other callbacks

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
                                 updateLiveMessage(liveStreamingMsgIdRef.current, currentFullText); // Pass the calculated full text directly
                             }
                         } else if (part.inlineData?.mimeType?.startsWith('audio/')) {
                              // --- Handle Audio ---
                              isAudioChunk = true;
                              if (liveModality === 'AUDIO') {
                                   if (!isModelSpeaking) setIsModelSpeaking(true);
                                   if (!audioContextRef.current) initAudioContext();
                                   if (audioContextRef.current?.state === 'running') {
                                        try { const bs = window.atob(part.inlineData.data); const len = bs.length; const bytes = new Uint8Array(len); for (let i = 0; i < len; i++) bytes[i] = bs.charCodeAt(i); audioQueueRef.current.push(bytes.buffer); playAudioQueue(); }
                                        catch (e) { console.error("[Audio] Decode/Queue Error:", e); setAudioError("Audio processing error."); }
                                   } else if (audioContextRef.current?.state !== 'closed') { console.warn('[Audio] Context not running, skipping queue.'); }
                                   else { setAudioError("Audio context closed."); }
                              }
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

            } // end if data.serverContent

            // --- Process Other Top-Level Events ---
            else if (data.setupComplete) {
                 console.log("✅ [Live WS] Processing 'setupComplete'.");
            } else if (data.serverToolCall) {
                 console.log("🔧 [Live WS] Processing 'serverToolCall'.");
                 addLiveMessage({ role: 'system', text: `Tool call: ${data.serverToolCall.functionCalls?.[0]?.name || '?'}` });
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
    };

    ws.onclose = (event) => {
      console.log(`[Live WS] Connection closed. Code: ${event.code}, Clean: ${event.wasClean}, Reason: ${event.reason}`);
      setLiveConnectionStatus(prev => prev === 'error' ? 'error' : 'disconnected');
      if (!event.wasClean && event.code !== 1000) { addLiveMessage({ role: 'system', text: `Connection lost (Code: ${event.code}).` }); }
      else if (event.code === 1000) { addLiveMessage({ role: 'system', text: 'Live session ended.' }); }
      liveWsConnection.current = null; // Clear the ref
      closeAudioContext();
      if (isRecording) stopRecordingInternal();
      setIsModelSpeaking(false); liveStreamingTextRef.current = ''; liveStreamingMsgIdRef.current = null;
    };
  }, [ liveModality, currentVoice, liveSystemInstruction, addLiveMessage, updateLiveMessage, initAudioContext, playAudioQueue, closeAudioContext, isRecording, stopRecordingInternal]); // Stable callbacks

  // --- Memoized Public Handlers ---
  const startLiveSession = useCallback(() => {
      // **Simplified start:** Directly call setup. The setup function now handles closing existing connections.
      if (liveModality === 'AUDIO') initAudioContext();
      setupLiveConnection();
  }, [liveModality, initAudioContext, setupLiveConnection]);

  const endLiveSession = useCallback(() => {
    if (liveWsConnection.current) {
        addLiveMessage({ role: 'system', text: 'Ending session...' });
        liveWsConnection.current.close(1000, "User ended session"); // Normal closure
        // onclose handles the rest
    } else {
        // Already closed or never started, ensure clean state
        setLiveConnectionStatus('disconnected');
        closeAudioContext();
        setIsModelSpeaking(false);
        if(isRecording) stopRecordingInternal(); // Ensure recording state is reset
    }
  }, [addLiveMessage, closeAudioContext, isRecording, stopRecordingInternal]); // Dependencies

  const sendLiveMessageText = useCallback((text) => {
    const ws = liveWsConnection.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !text.trim()) {
        console.warn("Cannot send live message, WS not ready or text empty."); return;
    }
    try {
        liveStreamingMsgIdRef.current = null; liveStreamingTextRef.current = ''; // Reset stream tracker
        ws.send(text);
        addLiveMessage({ role: 'user', text: text });
    } catch (e) {
        console.error('[Live WS] Send Error:', e); addLiveMessage({ role: 'error', text: `Send error: ${e.message}`});
    }
  }, [addLiveMessage]);

  // Expose stable recording controls
  const startRecording = useCallback(() => startRecordingInternal(), [startRecordingInternal]);
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
          closeAudioContext(); // Close audio context on unmount
      };
  }, [closeAudioContext]); // Depend only on stable closeAudioContext

  return {
    // State
    liveMessages, liveConnectionStatus, liveModality, isModelSpeaking, isRecording, audioError,
    liveSystemInstruction, // Keep original name for App.jsx prop clarity if preferred

    // Setters/Handlers
    setLiveModality,
    setLiveSystemInstruction, // Keep original name
    startLiveSession, endLiveSession, sendLiveMessage: sendLiveMessageText,
    startRecording, stopRecording,
  };
}
