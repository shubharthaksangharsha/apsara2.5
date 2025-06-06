import { useState, useRef, useCallback } from 'react';
import { decodePcm16ToFloat32 } from './utils';

export const useAudio = ({ 
  selectedModel, 
  inputSampleRate,
  addLiveMessage
}) => {
  // State
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioError, setAudioError] = useState(null);
  
  // Refs
  const audioContextRef = useRef(null); // For Playback (24kHz or 48kHz for native audio)
  const audioInputContextRef = useRef(null); // For Recording (16kHz)
  const scriptProcessorNodeRef = useRef(null); // For PCM capture
  const mediaStreamSourceRef = useRef(null); // Mic stream source
  const audioQueueRef = useRef([]);
  const isPlayingAudioRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const audioCompressorRef = useRef(null); // For enhanced native audio processing
  const outputTranscriptionBufferRef = useRef("");
  const inputTranscriptionBufferRef = useRef(""); // Buffer for input transcription
  const lastTranscriptionChunkRef = useRef("");

  // --- Memoized Audio Context Management ---
  const initAudioContexts = useCallback(() => {
     // Check if selected model supports native audio
     const isNativeAudioModel = selectedModel?.includes('native-audio');
     const playbackSampleRate = isNativeAudioModel ? 48000 : 24000; // Use 48kHz for native audio models
     
     if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        try {
            // Initialize audio context with appropriate sample rate based on model capabilities
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: playbackSampleRate });
            console.log(`[Audio Playback] Context initialized (${isNativeAudioModel ? '48kHz - Native Audio' : '24kHz'})`, 
                        audioContextRef.current.state);
            
            // For native audio models, add an audio compressor for better voice quality
            if (isNativeAudioModel) {
                try {
                    // Create a dynamics compressor for improved voice audio
                    const compressor = audioContextRef.current.createDynamicsCompressor();
                    compressor.threshold.value = -24;  // dB
                    compressor.knee.value = 30;        // dB - soft knee for more natural compression
                    compressor.ratio.value = 12;       // compression ratio
                    compressor.attack.value = 0.003;   // seconds - fast attack for voice
                    compressor.release.value = 0.25;   // seconds - moderate release
                    
                    // Store the compressor in a ref for future audio playback
                    audioCompressorRef.current = compressor;
                    
                    console.log('[Audio Playback] Enhanced audio processing with compressor for native audio model');
                } catch (compErr) {
                    console.warn('[Audio Playback] Could not initialize compressor, using standard audio pipeline:', compErr);
                }
            }
            
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
  }, [inputSampleRate, selectedModel]); // Depends on the target sample rate

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
  }, []);

  // --- Memoized Audio Playback ---
  const playAudioQueue = useCallback(async () => {
     const audioContext = audioContextRef.current;
     if (!audioContext) return;

     // Check if this is a native audio model for enhanced processing
     const isNativeAudioModel = selectedModel?.includes('native-audio');
     
     if (audioContext.state === 'suspended') {
       try { 
         await audioContext.resume(); 
         console.log(`[Audio] Resumed context (${isNativeAudioModel ? 'Native Audio' : 'Standard'})`);
       } catch (e) {
         console.error('[Audio] Failed to resume:', e); 
         setAudioError("Playback requires interaction."); 
         isPlayingAudioRef.current = false; 
         return;
       }
     }
     
     if (isPlayingAudioRef.current || audioQueueRef.current.length === 0 || audioContext.state !== 'running') return;
     
     // Start playback from queue
     isPlayingAudioRef.current = true;
     setIsModelSpeaking(true);
     
     // Log the audio playback configuration
     console.log(`[Audio] Starting playback with ${isNativeAudioModel ? 'enhanced native audio pipeline' : 'standard pipeline'} at ${audioContext.sampleRate}Hz`);
     
     while (audioQueueRef.current.length > 0) {
       const arrayBuffer = audioQueueRef.current.shift();
       if (!arrayBuffer || arrayBuffer.byteLength === 0) continue;
       
       try {
         // Convert PCM to float32 for audio processing
         const float32Data = decodePcm16ToFloat32(arrayBuffer);
         
         // Create buffer with appropriate sample rate from context
         const buffer = audioContext.createBuffer(1, float32Data.length, audioContext.sampleRate);
         buffer.copyToChannel(float32Data, 0);
         
         // Create source node for playback
         const source = audioContext.createBufferSource();
         source.buffer = buffer;
         
         // For native audio models, use our enhanced audio pipeline with compressor
         if (isNativeAudioModel && audioCompressorRef.current) {
           // Route through compressor for better voice quality
           source.connect(audioCompressorRef.current);
           audioCompressorRef.current.connect(audioContext.destination);
           console.log('[Audio] Using enhanced pipeline with compressor for native audio model');
         } else {
           // Standard pipeline for non-native audio or if compressor setup failed
           source.connect(audioContext.destination);
         }
         
         // Play the audio and wait for completion
         await new Promise(resolve => { 
           source.onended = resolve; 
           source.start(0); 
         });
       } catch (e) { 
         console.error("[Audio] Playback error:", e); 
         setAudioError("Error playing audio chunk."); 
       }
     }
     
     isPlayingAudioRef.current = false;
     setIsModelSpeaking(false);
   }, [selectedModel]); // Include selectedModel as dependency since we use it for audio pipeline decisions

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

   const startRecordingInternal = useCallback(async (ws, liveConnectionStatus) => {
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
   }, [isRecording, addLiveMessage, stopRecordingInternal, inputSampleRate]);

   // Public API
   const startRecording = useCallback(async (ws, liveConnectionStatus) => {
        // Attempt to resume context on user interaction (clicking record)
        if (audioInputContextRef.current && audioInputContextRef.current.state === 'suspended') {
            try { await audioInputContextRef.current.resume(); }
            catch (e) { console.error("[Audio Input] Failed to resume context on record click:", e); }
        }
        await startRecordingInternal(ws, liveConnectionStatus); // Now call the internal function
   }, [startRecordingInternal]);

   const stopRecording = useCallback(() => {
      stopRecordingInternal();
   }, [stopRecordingInternal]);

   // Function to enqueue audio for playback
   const enqueueAudio = useCallback((buffer) => {
     audioQueueRef.current.push(buffer);
     playAudioQueue();
   }, [playAudioQueue]);

   // Function to reset speaking state
   const resetSpeakingState = useCallback(() => {
     setIsModelSpeaking(false);
   }, []);

   return {
     // State
     isModelSpeaking,
     isRecording,
     audioError,
     
     // Functions
     initAudioContexts,
     closeAudioContexts,
     playAudioQueue,
     enqueueAudio,
     stopAndClearAudio,
     startRecording,
     stopRecording,
     resetSpeakingState,
     
     // Refs (exposed for main hook)
     audioContextRef,
     audioInputContextRef,
     inputTranscriptionBufferRef,
     outputTranscriptionBufferRef,
     lastTranscriptionChunkRef
   };
}; 