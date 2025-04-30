import React, { useState, useEffect, useRef } from 'react';
import { BellRing, FileUp, Menu, Mic, Moon, Send, Settings, Sun, User, X, MessageSquare, UploadCloud, AudioLines } from 'lucide-react';

const BACKEND_URL = 'http://localhost:9000';

const MAX_LOCALSTORAGE_SIZE_MB = 4.5; // Set a limit slightly below 5MB
const BYTES_PER_MB = 1024 * 1024;
const MAX_STORAGE_BYTES = MAX_LOCALSTORAGE_SIZE_MB * BYTES_PER_MB;

// Main App component
export default function App() {
  // Theme
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('darkMode') === 'true'
  );
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Models & Voices
  const [models, setModels] = useState([]);
  const [voices, setVoices] = useState([]);
  const [currentModel, setCurrentModel] = useState('gemini-2.0-flash');
  const [currentVoice, setCurrentVoice] = useState('Puck');

  // File upload state
  const [files, setFiles] = useState([]);
  
  // System instruction
  const [systemInstruction, setSystemInstruction] = useState('You are a helpful assistant.');

  useEffect(() => {
    // Fetch models, voices, and system instruction on load
    const fetchInitialData = async () => {
      try {
        const modelsRes = await fetch(`${BACKEND_URL}/models`);
        const modelsData = await modelsRes.json();
        setModels(modelsData);
        
        const voicesRes = await fetch(`${BACKEND_URL}/voices`);
        const voicesData = await voicesRes.json();
        setVoices(voicesData.voices || []);
        
        const systemRes = await fetch(`${BACKEND_URL}/system`);
        const systemData = await systemRes.json();
        setSystemInstruction(systemData.systemInstruction);
        
        const filesRes = await fetch(`${BACKEND_URL}/files`);
        const filesData = await filesRes.json();
        setFiles(filesData.files || []);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    
    fetchInitialData();
  }, []);

  // Conversations
  const [convos, setConvos] = useState(() => {
    try {
    return JSON.parse(localStorage.getItem('conversations') || '[]');
    } catch (e) {
      console.error("Error parsing conversations from localStorage:", e);
      localStorage.removeItem('conversations'); // Clear corrupted data
      return [];
    }
  });
  const [activeConvoId, setActiveConvoId] = useState(
    convos.length ? convos[0].id : null
  );

  useEffect(() => {
    try {
      let convosString = JSON.stringify(convos);
      let currentSize = new Blob([convosString]).size; // More accurate size estimation

      // Prune oldest conversations if size exceeds limit
      let prunedConvos = [...convos]; // Create a mutable copy
      while (currentSize > MAX_STORAGE_BYTES && prunedConvos.length > 1) { // Keep at least 1 convo
         const removedConvo = prunedConvos.pop(); // Remove the oldest (last in array due to unshift)
         console.warn(`Quota exceeded: Removing oldest conversation ('${removedConvo?.title || removedConvo?.id}') to free space.`);
         convosString = JSON.stringify(prunedConvos);
         currentSize = new Blob([convosString]).size;

         // Optional: Update activeConvoId if the pruned one was active
         // This might be complex depending on desired UX (e.g., switch to newest?)
         // For simplicity, we might just let it become null if the active one is pruned.
         if (activeConvoId === removedConvo?.id) {
             setActiveConvoId(prunedConvos.length > 0 ? prunedConvos[0].id : null);
             alert("The oldest conversation was removed to free up storage space as the limit was reached.");
         }
      }

      // If still too large even with only 1 convo, we might need to truncate *that* convo (more complex)
      // For now, just warn if pruning didn't help enough
       if (currentSize > MAX_STORAGE_BYTES && prunedConvos.length <= 1) {
          console.error("LocalStorage quota exceeded even after pruning. Cannot save conversation state reliably.");
          alert("Warning: Could not save conversation changes. Storage limit reached even with only one conversation.");
          // Avoid setting the item if it's guaranteed to fail
          return;
       }


      localStorage.setItem('conversations', convosString);
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
         console.error("LocalStorage quota exceeded:", e);
         // Maybe add a more prominent UI warning here
         alert("Error: Could not save conversation changes. Browser storage limit reached. Please delete some conversations manually or export them.");
      } else {
         console.error("Error saving conversations to localStorage:", e);
      }
    }
  }, [convos, activeConvoId]); // Add activeConvoId dependency if pruning logic uses it

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Live chat popup
  const [liveOpen, setLiveOpen] = useState(false);
  // File upload popup
  const [fileUploadOpen, setFileUploadOpen] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Start closed on mobile

  // Determine if system instruction is applicable for the current model
  const isSystemInstructionApplicable = currentModel !== 'gemini-2.0-flash-exp-image-generation';

  // Add new generation settings state
  const [temperature, setTemperature] = useState(0.7);
  const [maxOutputTokens, setMaxOutputTokens] = useState(8192);
  const [enableGoogleSearch, setEnableGoogleSearch] = useState(false);
  const [enableCodeExecution, setEnableCodeExecution] = useState(false); // Example state

  // Add effect to default sidebar open state based on screen size initially
  useEffect(() => {
    const checkSize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    checkSize(); // Check on initial load
    window.addEventListener('resize', checkSize); // Adjust on resize
    return () => window.removeEventListener('resize', checkSize); // Cleanup
  }, []);

  // --- Lifted Live Session State ---
  const [liveMessages, setLiveMessages] = useState([]);
  const [liveConnectionStatus, setLiveConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  const [liveWsConnection, setLiveWsConnection] = useState(null); // Store WS connection in App state
  // ---------------------------------

  // --- Audio Playback State ---
  const audioContextRef = useRef(null); // To hold the AudioContext instance
  const audioQueueRef = useRef([]);    // Queue for ArrayBuffers
  const isPlayingAudioRef = useRef(false); // Flag to prevent concurrent playback loops
  const [audioError, setAudioError] = useState(null); // To display audio errors if any
  // -----------------------------

  // Function to initialize AudioContext
  const initAudioContext = () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
       try {
         audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
            // Use the sample rate received from the API if possible, default to 24000
            // We might need to adjust this later based on actual mimeType received
            sampleRate: 24000
         });
         console.log('[Audio] AudioContext initialized. State:', audioContextRef.current.state);
         setAudioError(null); // Clear previous errors
       } catch (e) {
          console.error("[Audio] Error creating AudioContext:", e);
          setAudioError("Could not initialize audio playback.");
          audioContextRef.current = null;
       }
    } else {
       console.log('[Audio] AudioContext already initialized.');
    }
  };

  // Function to close AudioContext and clear resources
  const closeAudioContext = () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().then(() => {
              console.log('[Audio] AudioContext closed.');
          }).catch(e => console.error('[Audio] Error closing AudioContext:', e));
      }
      audioContextRef.current = null;
      audioQueueRef.current = []; // Clear queue
      isPlayingAudioRef.current = false; // Reset flag
  };

  // Function to decode PCM (assuming 16-bit signed integer) to Float32Array
  const decodePcm16ToFloat32 = (arrayBuffer) => {
      const pcmData = new Int16Array(arrayBuffer);
      const floatData = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
          floatData[i] = pcmData[i] / 32768.0; // Normalize to [-1.0, 1.0]
      }
      return floatData;
  };


   // Asynchronous function to play audio chunks from the queue
   const playAudioQueue = async () => {
       if (!audioContextRef.current || audioContextRef.current.state === 'suspended') {
           // Attempt to resume context if suspended (e.g., due to user interaction requirement)
           try {
               await audioContextRef.current?.resume();
               console.log('[Audio] AudioContext resumed.');
           } catch (e) {
                console.error('[Audio] Failed to resume AudioContext:', e);
                setAudioError("Audio playback requires user interaction.");
                isPlayingAudioRef.current = false; // Stop trying if resume fails
                return;
           }
       }

       if (isPlayingAudioRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current || audioContextRef.current.state !== 'running') {
           // If already playing, queue empty, or context not ready, bail out
           if (audioContextRef.current?.state !== 'running') {
              console.warn(`[Audio] Playback skipped, context state is: ${audioContextRef.current?.state}`);
           }
           return;
       }

       isPlayingAudioRef.current = true;
       console.log('[Audio] Starting playback loop.');

       while (audioQueueRef.current.length > 0) {
           const arrayBuffer = audioQueueRef.current.shift(); // Get next chunk
           if (!arrayBuffer || arrayBuffer.byteLength === 0) continue; // Skip empty chunks

           try {
               const float32Data = decodePcm16ToFloat32(arrayBuffer);
               const sampleRate = audioContextRef.current.sampleRate; // Use context's sample rate
               const audioBuffer = audioContextRef.current.createBuffer(
                   1, // Number of channels (mono)
                   float32Data.length, // Buffer length
                   sampleRate // Sample rate
               );

               audioBuffer.copyToChannel(float32Data, 0); // Copy decoded data

               const source = audioContextRef.current.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(audioContextRef.current.destination);

               // Promisify the 'onended' event
               await new Promise(resolve => {
                   source.onended = resolve;
                   source.start(0); // Play immediately
                   // console.log(`[Audio] Playing chunk, duration: ${audioBuffer.duration.toFixed(3)}s`);
               });
               // console.log('[Audio] Chunk finished playing.');

           } catch (e) {
               console.error("[Audio] Error processing or playing audio chunk:", e);
               setAudioError("Error playing audio chunk.");
               // Optionally break the loop on error? Or just skip the chunk?
               // break;
           }
       }

       console.log('[Audio] Playback loop finished.');
       isPlayingAudioRef.current = false;
        // Optional: Check queue again in case new chunks arrived during playback
       // setTimeout(playAudioQueue, 10); // Small delay before checking again
   };

  // Function to add messages to the live state
  const addLiveMessage = (msg) => {
    // Ensure unique IDs even if called rapidly
    setLiveMessages(prev => [...prev, { ...msg, id: Date.now() + Math.random() * 1000 }]);
  };

  const sendToBackend = async (text) => {
    if (!activeConvoId) {
      // Create a new conversation if none exists
      // Check conversation limit first (add a reasonable max limit)
      const MAX_CONVERSATIONS = 50; // Set a reasonable limit
      if (convos.length >= MAX_CONVERSATIONS) {
        alert("Maximum conversation limit reached. Please delete some conversations.");
        return;
      }
      
      const id = Date.now().toString();
      setConvos([{ id, title: 'New Chat', messages: [] }, ...convos]);
      setActiveConvoId(id);
      return;
    }
    
    setIsLoading(true);
    try {
      const activeConvo = convos.find(c => c.id === activeConvoId);
      if (!activeConvo) throw new Error('No active conversation found');
      
      // Filter messages to include only 'user' and 'model' roles for the API
      // AND ensure parts array is not empty
      const validMessages = (activeConvo.messages || [])
        .filter(msg => 
          (msg.role === 'user' || msg.role === 'model') && 
          msg.parts && msg.parts.length > 0 
        );
      const turns = [...validMessages, { role: 'user', parts: [{ text }] }];
      
      // Update UI immediately with user message
      setConvos(prev => prev.map(c => {
        if (c.id !== activeConvoId) return c;
        return { ...c, messages: [...c.messages, { role: 'user', parts: [{ text }] }] };
      }));
      
     // Update the response handling in sendToBackend function
      const baseRequestBody = {
        contents: turns,
        modelId: currentModel,
        config: applyConfigSettings({})
      };

      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseRequestBody)
      });
      
      const data = await response.json();
      
      // Handle potential error responses
      if (data.error) {
        throw new Error(data.error.message || data.error);
      }
      
      // Process the response - handle both parts array or string responses
      const responseParts = [];

      if (typeof data.response === 'string') {
        // Simple text response
        responseParts.push({ text: data.response });
      } else if (Array.isArray(data.response)) {
        // For structured responses with multiple parts (text and images) 
        responseParts.push(...data.response);
      } else if (data.response && data.response.parts) {
        // If response is in parts format directly
        responseParts.push(...data.response.parts);
      } else {
        // Fallback
        responseParts.push({ text: '(No response)' });
      }
      const reply = { 
        role: 'model', 
        parts: responseParts,
        metadata: {
          finishReason: data.finishReason,
          usageMetadata: data.usageMetadata
        }
      };
      
      // Update the conversation with the AI reply
      setConvos(prev => prev.map(c => {
        if (c.id !== activeConvoId) return c;
        return { ...c, messages: [...c.messages, reply] };
      }));
      
      // Update the conversation title if it's a new conversation
      if (activeConvo.messages.length === 0) {
        // Generate a title based on the first user message
        const newTitle = text.length > 30 
          ? text.substring(0, 30) + '...' 
          : text;
        
        setConvos(prev => prev.map(c => {
          if (c.id !== activeConvoId) return c;
          return { ...c, title: newTitle };
        }));
      }
    } catch (err) {
      console.error('Chat error:', err);
      // Add error message to conversation
      setConvos(prev => prev.map(c => {
        if (c.id !== activeConvoId) return c;
        return { 
          ...c, 
          messages: [...c.messages, { 
            role: 'error', 
            parts: [{ text: `Error: ${err.message}` }] 
          }]
        };
      }));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update the streaming chat function
  const startStreamChat = async (text) => {
    if (!activeConvoId) return;
    
    setIsLoading(true);
    try {
      const activeConvo = convos.find(c => c.id === activeConvoId);
      if (!activeConvo) throw new Error('No active conversation found');
      
      // Filter messages to include only 'user' and 'model' roles for the API
      // AND ensure parts array is not empty
      const validMessages = (activeConvo.messages || [])
         .filter(msg => 
           (msg.role === 'user' || msg.role === 'model') && 
           msg.parts && msg.parts.length > 0
         );
      const turns = [...validMessages, { role: 'user', parts: [{ text }] }];
      
      // Update UI immediately with user message
      setConvos(prev => prev.map(c => {
        if (c.id !== activeConvoId) return c;
        return { 
          ...c, 
          messages: [...c.messages, { role: 'user', parts: [{ text }] }, { role: 'model', parts: [] }] 
        };
      }));
    

      
      // Create a placeholder for aggregating the streamed response
      let responseParts = [];
      let currentTextPart = '';
      
      // Start the SSE request
      const baseRequestBody = {
        contents: turns,
        modelId: currentModel,
        config: applyConfigSettings({})
      };

      const response = await fetch(`${BACKEND_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseRequestBody)
      });
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Handle text chunks
              if (data.text) {
                currentTextPart += data.text;
                
                // Update parts array with current text
                let updatedParts = [...responseParts];
                
                // If the last part is a text part, update it, otherwise add a new text part
                if (updatedParts.length > 0 && 'text' in updatedParts[updatedParts.length - 1]) {
                  updatedParts[updatedParts.length - 1].text = currentTextPart;
                } else {
                  updatedParts.push({ text: currentTextPart });
                }
                
                // Update the conversation with the partial response
                setConvos(prev => prev.map(c => {
                  if (c.id !== activeConvoId) return c;
                  const messages = [...c.messages];
                  messages[messages.length - 1] = { 
                    role: 'model', 
                    parts: updatedParts
                  };
                  return { ...c, messages };
                }));
              }
              
              // Handle image data
              if (data.inlineData && data.inlineData.mimeType && data.inlineData.mimeType.startsWith('image/')) {
                // Finish any current text part
                if (currentTextPart) {
                  responseParts.push({ text: currentTextPart });
                  currentTextPart = '';
                }
                
                // Add the image part
                responseParts.push({
                  inlineData: {
                    mimeType: data.inlineData.mimeType,
                    data: data.inlineData.data
                  }
                });
                
                // Update the conversation with text + image
                setConvos(prev => prev.map(c => {
                  if (c.id !== activeConvoId) return c;
                  const messages = [...c.messages];
                  messages[messages.length - 1] = { 
                    role: 'model', 
                    parts: responseParts
                  };
                  return { ...c, messages };
                }));
              }
              
              // Handle message completion
              if (data.finishReason) {
                // Ensure any remaining text is added
                if (currentTextPart) {
                  responseParts.push({ text: currentTextPart });
                  
                  // Final update
                  setConvos(prev => prev.map(c => {
                    if (c.id !== activeConvoId) return c;
                    const messages = [...c.messages];
                    messages[messages.length - 1] = { 
                      role: 'model', 
                      parts: responseParts,
                      metadata: {
                        finishReason: data.finishReason,
                        usageMetadata: data.usageMetadata
                      }
                    };
                    return { ...c, messages };
                  }));
                }
              }
            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          } else if (line.startsWith('event: done')) {
            // Stream completed
            break;
          }
        }
      }
      
    } catch (err) {
      console.error('Stream chat error:', err);
      // Add error message to conversation
      setConvos(prev => prev.map(c => {
        if (c.id !== activeConvoId) return c;
        const messages = [...c.messages];
        if (messages[messages.length - 1].role === 'model') {
          // Replace the empty or partial response with an error
          messages[messages.length - 1] = { 
            role: 'error', 
            parts: [{ text: `Error: ${err.message}` }] 
          };
        } else {
          // Add a new error message
          messages.push({ 
            role: 'error', 
            parts: [{ text: `Error: ${err.message}` }] 
          });
        }
        return { ...c, messages };
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // File upload handler
  const uploadFile = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${BACKEND_URL}/files`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      setFiles(prev => [...prev, data.file]);
      
      return data.file;
    } catch (err) {
      console.error('File upload error:', err);
      return null;
    }
  };

  // Live chat connection setup - Modified to handle audio
  const setupLiveConnection = (voiceName = currentVoice, withAudio = true) => {
     // Use the state setter from App component directly
     setLiveConnectionStatus('connecting');
     addLiveMessage({ role: 'system', text: 'Initiating live session...' }); // Use addLiveMessage

     // Clear previous messages on new connection attempt
     setLiveMessages([]);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
     const params = new URLSearchParams();
     params.append('modalities', withAudio ? 'AUDIO' : 'TEXT');
     if (withAudio && voiceName) {
       params.append('voice', voiceName);
     }
     const wsUrl = `${protocol}//${window.location.host}/live?${params.toString()}`;

     console.log(`[Live Setup] Connecting to: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);

     // Store the WebSocket connection in App's state
     setLiveWsConnection(ws);
    
    ws.onopen = () => {
       console.log('[Live WS] Browser-Backend WS Connection established (onopen fired)');
       addLiveMessage({ role: 'system', text: 'Browser-Backend WS connection established. Waiting for backend...' });
       if (activeConvoId) { /* add 'Live chat session started' */ }
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
         console.log('[Live WS] Message received (raw):', data);

         if (data.event === 'backend_connected') {
            addLiveMessage({ role: 'system', text: 'Backend acknowledged. Connecting to Google AI...' });
        } else if (data.event === 'connected') {
            addLiveMessage({ role: 'system', text: 'Live connection to AI active.' });
            setLiveConnectionStatus('connected'); // Update App state
        } else if (data.event === 'error') {
            console.error('[Live WS] Backend/Google Error:', data.message);
            addLiveMessage({ role: 'error', text: `Error: ${data.message}` });
            setLiveConnectionStatus('error'); // Update App state
        } else if (data.event === 'closed') {
             addLiveMessage({ role: 'system', text: `Live AI connection closed. ${data.reason || ''}` });
             // ws.onclose handles final status update
         }
         // Check for serverContent structure
         else if (data.serverContent && data.serverContent.modelTurn && Array.isArray(data.serverContent.modelTurn.parts)) {
             let receivedText = '';
             let audioChunkReceived = false;
             for (const part of data.serverContent.modelTurn.parts) {
                 if (part.text) {
                     receivedText += part.text;
                 } else if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
                      // --- Audio Handling ---
                      try {
                         // Extract sample rate if possible (e.g., from 'audio/pcm;rate=24000')
                         const mimeMatch = part.inlineData.mimeType.match(/rate=(\d+)/);
                         const sampleRate = mimeMatch ? parseInt(mimeMatch[1], 10) : 24000; // Default 24k

                          // Ensure AudioContext has the correct sample rate (or handle mismatch)
                          if (audioContextRef.current && audioContextRef.current.sampleRate !== sampleRate) {
                              console.warn(`[Audio] Sample rate mismatch! Context: ${audioContextRef.current.sampleRate}, Chunk: ${sampleRate}. Reinitializing context.`);
                              closeAudioContext(); // Close existing context
                              audioContextRef.current = new AudioContext({ sampleRate }); // Recreate with new rate
                          } else if (!audioContextRef.current) {
                              // Initialize if not already done (e.g., if audio session started without explicit init)
                              initAudioContext();
                              if (audioContextRef.current) audioContextRef.current.sampleRate = sampleRate; // Adjust rate
                          }


                         // Decode base64 to ArrayBuffer
                         const binaryString = window.atob(part.inlineData.data);
                         const len = binaryString.length;
                         const bytes = new Uint8Array(len);
                         for (let i = 0; i < len; i++) {
                             bytes[i] = binaryString.charCodeAt(i);
                         }
                         const arrayBuffer = bytes.buffer;

                         // Add to queue and trigger playback check
                         audioQueueRef.current.push(arrayBuffer);
                         audioChunkReceived = true; // Mark that audio was received in this message
                         playAudioQueue(); // Attempt to start playback if not already playing

                      } catch (decodeError) {
                           console.error("[Audio] Error decoding/queuing audio data:", decodeError);
                           addLiveMessage({ role: 'error', text: 'Error processing audio data.' });
                      }
                      // ------------------------
                 }
             }

             // Update UI with text OR audio placeholder
             if (receivedText) {
                 console.log('[Live WS] Extracted model text:', receivedText);
                 // Update Live messages state (streaming logic)
                 setLiveMessages(prevMessages => {
                    const lastLiveMsg = prevMessages[prevMessages.length - 1];
                    const isFinalChunk = data.serverContent.generationComplete || data.serverContent.turnComplete;
                    if (lastLiveMsg && lastLiveMsg.role === 'model' && !isFinalChunk) {
                         const updatedMessages = [...prevMessages];
                         updatedMessages[updatedMessages.length - 1] = { ...lastLiveMsg, text: lastLiveMsg.text + receivedText };
                         return updatedMessages;
                    } else {
                         return [...prevMessages, { role: 'model', text: receivedText, id: Date.now() + Math.random() }];
                    }
                 });
                 // Also update main conversation state
                 if (activeConvoId) { /* ... update setConvos logic ... */ }
             } else if (audioChunkReceived) {
                 // Only add the placeholder if NO text was received in this specific message
                 // Avoids spamming placeholders if text and audio are slightly interleaved
                 addLiveMessage({ role: 'system', icon: AudioLines, text: '(Audio response chunk received)' });
             }
             // Log completion flags if needed
             // if (data.serverContent.generationComplete) ...
             // if (data.serverContent.turnComplete) ...
         }
         // ... other handlers (speechRecognitionResult, usageMetadata, etc.) ...

      } catch (err) {
         console.error('[Live WS] Error processing message:', err, 'Raw data:', event.data);
         addLiveMessage({ role: 'error', text: `Error processing message: ${err.message}` });
      }
    };
    
    ws.onerror = (error) => {
        console.error('[Live WS] WebSocket error event:', error);
        setLiveConnectionStatus('error'); // Update App state
        addLiveMessage({ role: 'error', text: 'WebSocket connection error. Check browser console.' });
        closeAudioContext();
    };
    
    ws.onclose = (event) => {
        console.log(`[Live WS] Connection closed. Code: ${event.code}, Reason: "${event.reason}", Clean: ${event.wasClean}`);
        // Update status only if it wasn't already an error
        setLiveConnectionStatus(prevStatus => prevStatus === 'error' ? 'error' : 'disconnected'); // Update App state
        addLiveMessage({ role: 'system', text: `Live session ended. Code: ${event.code}` });
        setLiveWsConnection(null); // Clear WS connection state
        if (activeConvoId) { /* add closing message to main convo */ }
        closeAudioContext();
     };

     // Return ws might not be needed if managed via state now
     // return ws;
   };

   // Modified function to be called by LivePopup to start the session
   const startLiveSession = (voice, audioEnabled) => {
       // Close any existing connection/context first
       endLiveSession(); // Ensure cleanup before starting new

       if (audioEnabled) {
          initAudioContext(); // Initialize audio context if audio is requested
       }
       setupLiveConnection(voice, audioEnabled);
   };

   // Modified function to be called by LivePopup to end the session
   const endLiveSession = () => {
       if (liveWsConnection) {
           addLiveMessage({ role: 'system', text: 'Closing connection...' });
           liveWsConnection.close();
           setLiveWsConnection(null);
       }
       closeAudioContext(); // Close audio context and clear resources on session end
   };

    // Function to be called by LivePopup to send a message
    const sendLiveMessage = (text) => {
       if (!liveWsConnection || liveConnectionStatus !== 'connected' || !text.trim()) {
           console.warn(`[App] Cannot send live message. WS: ${liveWsConnection}, Status: ${liveConnectionStatus}, Text: ${text}`);
           addLiveMessage({ role: 'error', text: 'Cannot send message: Not connected or empty.' });
           return;
       }
       try {
           liveWsConnection.send(text);
           addLiveMessage({ role: 'user', text: text }); // Add user message to display
       } catch (e) {
           console.error("[App] Error sending live message:", e);
           addLiveMessage({ role: 'error', text: `Failed to send message: ${e.message}` });
       }
    };

  // Function to close sidebar, can be used by overlay or close button
  const closeSidebar = () => setIsSidebarOpen(false);

  // Apply config settings to API request body
  const applyConfigSettings = (config = {}) => {
     // Ensure generationConfig exists
     config.generationConfig = config.generationConfig || {};

     // Apply Temperature and Max Tokens
     config.generationConfig.temperature = temperature;
     config.generationConfig.maxOutputTokens = maxOutputTokens;

     // Apply System Instruction if applicable
     if (isSystemInstructionApplicable) {
        config.systemInstruction = systemInstruction;
     } else {
         delete config.systemInstruction; // Ensure it's removed if not applicable
     }

     // Apply Tools (Search, Code Execution)
     config.tools = config.tools || []; // Initialize if needed
     // Remove existing search/code tools before potentially adding them back
     config.tools = config.tools.filter(tool => !tool.googleSearch && !tool.executableCode);

     if (enableGoogleSearch) {
        config.tools.push({ googleSearch: {} });
     }
     if (enableCodeExecution) {
         // The backend expects `executableCode: {}` within a tool definition? Check buildApiRequest
         // Let's assume for now the backend handles a top-level config flag or similar.
         // OR, modify buildApiRequest to accept a simple boolean/object.
         // For simplicity, let's assume the backend handles it via a top-level flag if present.
         // config.enableCodeExecution = true; // Example - This might need backend adjustment
         // If backend expects it in tools:
         // config.tools.push({ executableCode: {} }); // Add if backend expects this structure
     }
     // Remove empty tools array
     if (config.tools.length === 0) {
        delete config.tools;
     }

     // Clean up empty generationConfig if only defaults were present and removed
     if (Object.keys(config.generationConfig).length === 0) {
         delete config.generationConfig;
     }

     return config;
  }

  return (
    // Changed outer div to relative for potential overlay positioning
    <div className="relative flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans overflow-hidden">
      {/* Sidebar Overlay (for closing on mobile/smaller screens) */}
      {isSidebarOpen && (
        <div
           onClick={closeSidebar}
           className="fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden" // Only show overlay on smaller screens
           aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      {/* Added transition and conditional transform */}
      <aside
        className={`absolute lg:relative inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col h-full z-40
                   transform transition-transform duration-300 ease-in-out
                   ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
         {/* Added Close button for mobile */}
         <button
           onClick={closeSidebar}
           className="absolute top-3 right-3 p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
           aria-label="Close sidebar"
         >
           <X className="h-5 w-5" />
         </button>

        <div className="p-4 text-xl font-semibold bg-indigo-600 text-white flex items-center gap-2">
          <BellRing className="h-5 w-5" />
          <span>Apsara Assistant</span>
        </div>
        
        <button
          className="flex items-center justify-center gap-2 mx-4 my-3 p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          onClick={() => {
            const id = Date.now().toString();
            setConvos([{ id, title: 'New Chat', messages: [] }, ...convos]);
            setActiveConvoId(id);
            if (window.innerWidth < 1024) closeSidebar(); // Close sidebar on mobile after creating chat
          }}
        >
          <span className="text-lg">+</span> New Chat
        </button>
        
        <div className="flex-1 overflow-auto px-2">
           {/* Added my-0 to remove extra top margin */}
           <div className="my-0 flex justify-between items-center px-2 py-2">
             <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            Conversations
             </div>
             {convos.length > 0 && (
                <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete all conversations?')) {
                        setConvos([]);
                        setActiveConvoId(null);
                      }
                    }}
                    className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="Delete all conversations"
                  >
                    Delete All
                 </button>
               )}
          </div>
          <ul className="space-y-1">
          {convos.map(c => (
          <li
            key={c.id}
            className={`px-3 py-2 rounded-md cursor-pointer transition-colors flex justify-between items-center ${
              c.id === activeConvoId 
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div 
                  className="flex items-center flex-1 min-w-0" // Added min-w-0 for better truncation
                  onClick={() => {
                      setActiveConvoId(c.id);
                      if (window.innerWidth < 1024) closeSidebar(); // Close sidebar on mobile after selecting chat
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mr-2 flex-shrink-0"></div>
              <div className="truncate text-sm">{c.title}</div>
            </div>
            <button 
              onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the li's onClick
                setConvos(prev => prev.filter(convo => convo.id !== c.id));
                    if (activeConvoId === c.id) {
                       // Find the next available convo or set to null
                       const remainingConvos = convos.filter(convo => convo.id !== c.id);
                       setActiveConvoId(remainingConvos.length > 0 ? remainingConvos[0].id : null);
                    }
                  }}
                  className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 ml-2 flex-shrink-0" // Added margin and shrink
              title="Delete conversation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </li>
        ))}
          </ul>
        </div>
        
        {/* ... User info and theme toggle ... */}
        <div className="mt-auto border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-200 dark:bg-indigo-700 flex items-center justify-center">
                <User className="h-4 w-4 text-indigo-700 dark:text-indigo-200" />
              </div>
              <span className="text-sm font-medium">shubharthak</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      {/* Added transition for potential margin shift if needed, though overlay is simpler */}
      <main className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10 py-2 px-4 flex-shrink-0">
          <div className="flex items-center justify-between">
             {/* Hamburger Menu Button */}
             <button
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors lg:hidden" // Hide on large screens where sidebar is relative
               aria-label="Toggle sidebar"
             >
               <Menu className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
             </button>

             {/* Spacer to push Model select left when hamburger is hidden */}
             <div className="hidden lg:block w-8"></div>

            <div className="flex items-center space-x-4">
              {/* Model Select - unchanged */}
              <div className="flex items-center flex-shrink min-w-0 mx-2">
                <label htmlFor="modelSelect" className="text-sm font-medium mr-2 flex-shrink-0">Model:</label>
                <select
                  id="modelSelect"
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md p-1 bg-white dark:bg-gray-700 truncate"
                  value={currentModel}
                  onChange={e => setCurrentModel(e.target.value)}
                >
                  {models.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Header Buttons */}
            <div className="flex items-center space-x-1 sm:space-x-2">
                {/* Theme Toggle */}
                <button onClick={() => setDarkMode(!darkMode)} className="..." title="Toggle Theme">
                   {/* ... icon ... */}
              </button>

                {/* Live Button */}
                <button onClick={() => setLiveOpen(true)} className="..." title="Start Live Session">
                   <MessageSquare className="..." />
              </button>

                {/* Settings Button */}
                <button onClick={() => setSettingsOpen(true)} className="..." title="Settings">
                   <Settings className="..." />
              </button>
            </div>
          </div>
        </header>
        
        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          {activeConvoId && convos.find(c => c.id === activeConvoId) ? (
            <ChatWindow convo={convos.find(c => c.id === activeConvoId)} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
              <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mb-4">
                <BellRing className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-medium mb-2">Welcome to Apsara Assistant</h3>
              <p className="max-w-md mb-6">Start a new conversation or select an existing chat from the sidebar.</p>
              <button 
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                onClick={() => {
                  const id = Date.now().toString();
                  setConvos([{ id, title: 'New Chat', messages: [] }, ...convos]);
                  setActiveConvoId(id);
                }}
              >
                Start New Chat
              </button>
            </div>
          )}
        </div>
        
        {/* Message Input */}
        <MessageInput
          onSend={sendToBackend}
          onStreamSend={startStreamChat}
          isLoading={isLoading}
          disabled={!activeConvoId}
          onFileUploadClick={() => setFileUploadOpen(true)}
        />
      </main>

      {/* Settings Panel - Mount/Unmount controlled by settingsOpen */}
      {settingsOpen && (
        <SettingsPanel
          currentModel={currentModel}
          isSystemInstructionApplicable={isSystemInstructionApplicable}
          currentVoice={currentVoice}
          voices={voices}
          systemInstruction={systemInstruction}
          onSystemInstructionChange={setSystemInstruction}
          onVoiceChange={setCurrentVoice}
          onClose={() => setSettingsOpen(false)}
          isOpen={settingsOpen}
          temperature={temperature}
          maxOutputTokens={maxOutputTokens}
          enableGoogleSearch={enableGoogleSearch}
          enableCodeExecution={enableCodeExecution}
          onTemperatureChange={setTemperature}
          onMaxOutputTokensChange={setMaxOutputTokens}
          onEnableGoogleSearchChange={setEnableGoogleSearch}
          onEnableCodeExecutionChange={setEnableCodeExecution}
        />
      )}

      {/* Live Chat Popup - Pass down state and handlers */}
      {liveOpen && (
        <LivePopup 
          // State props
          connectionStatus={liveConnectionStatus}
          messages={liveMessages}
          currentVoice={currentVoice} // Still needed for display/selection
          audioError={audioError} // Pass audio error state
          // Handler props
          onClose={() => {
              endLiveSession(); // Ensure session ends when popup is closed
              setLiveOpen(false);
          }}
          onStartSession={startLiveSession} // Use the App's start function
          onEndSession={endLiveSession}     // Use the App's end function
          onSendMessage={sendLiveMessage}   // Use the App's send function
        />
      )}

      {/* File Upload Popup - unchanged */}
      {fileUploadOpen && (
        <FileUploadPopup
          onClose={() => setFileUploadOpen(false)}
          onUpload={uploadFile}
          files={files}
        />
      )}
    </div>
  );
}

// Chat Window Component
function ChatWindow({ convo }) {
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convo.messages]);

  if (!convo) return null;
  
  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      {convo.messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' 
                ? 'bg-indigo-500 text-white' 
                : msg.role === 'error'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : msg.role === 'system'
                ? 'bg-gray-200 dark:bg-gray-700 italic text-sm'
                : 'bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700'
            }`}
          >
            {msg.parts.map((part, i) => {
              // Handle different part types
              if (part.text) {
                return (
                  <div key={i} className="whitespace-pre-wrap">
                    {part.text}
                  </div>
                );
              } else if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')) {
                // Display image content
                return (
                  <div key={i} className="my-2">
                    <img 
                      src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
                      alt="Generated image"
                      className="max-w-full rounded-md"
                    />
                  </div>
                );
              } else {
                return null;
              }
            })}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

// Message Input Component
function MessageInput({ onSend, onStreamSend, isLoading, disabled, onFileUploadClick }) {
  const [text, setText] = useState('');
  const inputRef = useRef();
  const [useStreaming, setUseStreaming] = useState(false);
  
  const handleSend = () => {
    if (!text.trim()) return;
    
    if (useStreaming) {
      onStreamSend(text.trim());
    } else {
      onSend(text.trim());
    }
    setText('');
  };
  
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-2 sm:p-4 bg-white dark:bg-gray-800">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            className="flex-1 w-full resize-none p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
            placeholder={
              disabled ? "Start a conversation..." : 
              isLoading ? "Waiting for response..." : 
              "Type your message..."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            disabled={isLoading || disabled}
            style={{ maxHeight: '150px' }}
          />
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={onFileUploadClick}
              disabled={isLoading || disabled}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition group disabled:opacity-50 disabled:cursor-not-allowed"
              title="Attach File"
            >
              <UploadCloud className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
            </button>
            <label className="flex items-center cursor-pointer group" title="Toggle Streaming Response">
                <input 
                  type="checkbox" 
                  checked={useStreaming} 
                  onChange={() => setUseStreaming(!useStreaming)}
                  className="sr-only peer"
                  disabled={isLoading || disabled}
                />
              <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-500 group-hover:scale-105"></div>
              </label>
            <button
              onClick={handleSend}
              disabled={isLoading || disabled || !text.trim()}
              className="p-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center hidden sm:block">
          {useStreaming ? "Streaming mode: AI responses appear in real-time." : "Shift+Enter for new line."}
        </div>
      </div>
    </div>
  );
}

// Settings Panel Component
function SettingsPanel({ 
  currentModel,
  isSystemInstructionApplicable,
  currentVoice, 
  voices, 
  systemInstruction,
  onSystemInstructionChange,
  onVoiceChange, 
  onClose,
  isOpen,
  temperature,
  maxOutputTokens,
  enableGoogleSearch,
  enableCodeExecution,
  onTemperatureChange,
  onMaxOutputTokensChange,
  onEnableGoogleSearchChange,
  onEnableCodeExecutionChange
}) {
  const [tempInstruction, setTempInstruction] = useState(systemInstruction);
  // Add state for other settings directly using props/setters
  // const [tempVoice, setTempVoice] = useState(currentVoice); // Removed as per previous request

  // --- FIX: Define isVisible state ---
  const [isVisible, setIsVisible] = useState(false);
  // -----------------------------------

  useEffect(() => {
    // Timeout ensures the component is mounted before applying the visible class
    let timeoutId;
    if (isOpen) {
       // Use a minimal timeout to allow initial render before transition starts
       timeoutId = setTimeout(() => setIsVisible(true), 10);
    } else {
       setIsVisible(false);
       // You might want to call onClose after the transition duration if needed
       // e.g., setTimeout(onClose, 300); // Match the duration-300
    }
     return () => clearTimeout(timeoutId); // Cleanup timeout
  }, [isOpen]);
  
  const handleSave = async () => {
    try {
      // Update system instruction ONLY IF it's applicable and changed
      if (isSystemInstructionApplicable && tempInstruction !== systemInstruction) {
        console.log("Attempting to save system instruction:", tempInstruction);
        const sysRes = await fetch(`${BACKEND_URL}/system`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instruction: tempInstruction })
        });
         console.log("System instruction save response status:", sysRes.status);
         if (!sysRes.ok) {
            const errData = await sysRes.json().catch(() => ({}));
            console.error("Error saving system instruction:", sysRes.status, errData);
            throw new Error(`Failed to save system instruction (Status: ${sysRes.status}) ${errData.error || ''}`);
         }
        onSystemInstructionChange(tempInstruction);
      } else if (!isSystemInstructionApplicable) {
         console.log("System instruction not applicable for this model, not saving.");
      }
      
      // Update voice selection
      if (currentVoice !== currentVoice) {
        await fetch(`${BACKEND_URL}/voices/select`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceName: currentVoice })
        });
        onVoiceChange(currentVoice);
      }
      
      onClose();
    } catch (err) {
      console.error('Error saving settings:', err);
      alert(`Error saving settings: ${err.message}`);
    }
  };

  const handleOverlayClick = (e) => {
     // Only close if the click is directly on the overlay
     if (e.target === e.currentTarget) {
        onClose();
     }
  }
  
  return (
    <div
      // Use isVisible to control opacity and pointer events for smooth exit
      className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-end z-50 transition-opacity duration-300 ease-in-out ${isOpen && isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={handleOverlayClick}
    >
      <div
        className={`w-full max-w-md h-full bg-white dark:bg-gray-800 p-6 shadow-xl flex flex-col
                  transform transition-transform duration-300 ease-in-out
                  ${isOpen && isVisible ? 'translate-x-0' : 'translate-x-full'}`} // Apply transform based on isVisible as well
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </h2>
          <button 
            onClick={onClose} // Use the passed onClose function
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" /> {/* Changed to X icon */}
          </button>
        </div>
        
        <div className="flex-1 space-y-6 overflow-y-auto pr-1 custom-scrollbar">
          <div>
            <label htmlFor="systemInstruction" className={`block text-sm font-medium mb-2 ${!isSystemInstructionApplicable ? 'text-gray-400 dark:text-gray-500' : ''}`}>
              System Instruction
            </label>
            <textarea
              id="systemInstruction"
              className={`w-full p-3 border rounded-md ... ${!isSystemInstructionApplicable ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60' : 'bg-white dark:bg-gray-700'}`}
              rows={5}
              value={isSystemInstructionApplicable ? tempInstruction : ''}
              onChange={(e) => isSystemInstructionApplicable && setTempInstruction(e.target.value)}
              placeholder={isSystemInstructionApplicable ? "Set the AI's behavior..." : "Not applicable for image generation model"}
              disabled={!isSystemInstructionApplicable}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {isSystemInstructionApplicable
                 ? "Sets the context and behavior for the AI."
                 : "System instructions are not supported by the selected image generation model."
              }
            </p>
          </div>
          
          <div>
            <label htmlFor="temperature" className="block text-sm font-medium mb-1">
              Temperature: <span className="font-normal text-gray-500 dark:text-gray-400">({temperature.toFixed(1)})</span>
            </label>
            <input
              id="temperature"
              type="range"
              min="0"
              max="1" // Or 2, depending on model support
              step="0.1"
              value={temperature}
              onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Controls randomness. Lower values are more deterministic.
            </p>
          </div>

          <div>
            <label htmlFor="maxOutputTokens" className="block text-sm font-medium mb-1">
              Max Output Tokens
            </label>
            <input
              id="maxOutputTokens"
              type="number"
              min="1"
              max="8192" // Adjust max based on model limits if needed
              step="1"
              value={maxOutputTokens}
              onChange={(e) => onMaxOutputTokensChange(parseInt(e.target.value, 10) || 1)} // Ensure valid number
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maximum number of tokens to generate in the response.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="googleSearch" className="text-sm font-medium">
                Enable Google Search (Grounding)
            </label>
            <label className="inline-flex items-center cursor-pointer">
                <input
                  id="googleSearch"
                  type="checkbox"
                  checked={enableGoogleSearch}
                  onChange={(e) => onEnableGoogleSearchChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
              Allows the model to search Google for current information. Requires backend support.
          </p>
        </div>
        
        <div className="mt-auto pt-6 flex justify-end space-x-4 flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose} // Use the passed onClose function
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// Live Chat Popup Component - Display Audio Error and use Icon
function LivePopup({
    // Receive state and handlers as props
    connectionStatus,
    messages,
    currentVoice,
    onClose,
    onStartSession,
    onEndSession,
    onSendMessage,
    audioError
}) {
  // State specific to the popup input/UI elements
  const [useAudio, setUseAudio] = useState(true);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Use effect for scrolling remains
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Internal handler for sending message, calls prop
  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim()); // Call handler passed from App
    setInputText('');
  };

  // Internal handler for starting session, calls prop
  const handleStartSession = () => {
     onStartSession(currentVoice, useAudio); // Call handler passed from App
  }

  // Helper to render messages with potential icon
  const renderMessageContent = (msg) => {
     if (msg.icon) {
        const IconComponent = msg.icon;
        return <span className="flex items-center gap-1.5"><IconComponent className="h-4 w-4 inline-block opacity-70" /> {msg.text}</span>;
     }
     return msg.text;
  }

  const getStatusIndicator = () => {
    switch (connectionStatus) {
      case 'connecting': return <span className="text-yellow-500">Connecting...</span>;
      case 'connected': return <span className="text-green-500">Connected</span>;
      case 'error': return <span className="text-red-500">Error</span>;
      case 'disconnected': return <span className="text-gray-500">Disconnected</span>;
      default: return null;
    }
  };

  const isSessionActive = connectionStatus === 'connected' || connectionStatus === 'connecting';
  
  return (
    // Added backdrop blur and increased max-width
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl h-full max-h-[85vh] sm:h-[75vh] bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
            Apsara Live
          </h2>
          <div className="text-sm font-medium">{getStatusIndicator()}</div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ×
          </button>
        </div>
        
        {/* Message Display Area - Uses messages prop */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2 border rounded-md p-3 bg-gray-50 dark:bg-gray-900/50 custom-scrollbar">
           {messages.map((msg) => (
             <div
               key={msg.id}
               className={`flex ${
                 msg.role === 'user' ? 'justify-end' : 'justify-start'
               }`}
             >
               <div
                 className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                   msg.role === 'user'
                     ? 'bg-indigo-500 text-white'
                     : msg.role === 'model'
                     ? 'bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600'
                     : msg.role === 'system'
                     ? 'bg-gray-200 dark:bg-gray-600 italic text-gray-600 dark:text-gray-300'
                     : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                 }`}
               >
                 {renderMessageContent(msg)} {/* Use helper to render */}
               </div>
             </div>
           ))}
           <div ref={messagesEndRef} />
        </div>

        {/* Controls Area */}
        <div className="space-y-4 flex-shrink-0">
            {/* Display Audio Error */}
            {audioError && (
                <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-md text-center">
                    Audio Error: {audioError}
                </div>
            )}

            {!isSessionActive && connectionStatus !== 'error' && (
              <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAudio}
                      onChange={() => setUseAudio(!useAudio)}
                    className="w-4 h-4 text-indigo-600 dark:text-indigo-400 rounded focus:ring-indigo-500"
                    />
                  <span className="text-sm">Enable audio responses (Voice: {currentVoice})</span>
                  </label>
                 <button
                  onClick={handleStartSession} // Use internal handler
                  disabled={connectionStatus === 'connecting'}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {connectionStatus === 'connecting' ? 'Connecting...' : 'Start Session'}
                </button>
                </div>
            )}

            {isSessionActive && (
                <div className="relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       handleSendMessage(); // Use internal handler
                      }
                    }}
                  className="w-full p-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Type a message..."
                  disabled={connectionStatus !== 'connected'}
                  />
                  <button
                  onClick={handleSendMessage} // Use internal handler
                  disabled={connectionStatus !== 'connected' || !inputText.trim()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-5 w-5" />
                  </button>
              </div>
            )}
          
            {(isSessionActive || connectionStatus === 'error') && (
              <div className="flex justify-end">
              <button
                  onClick={onEndSession} // Call prop directly
                  disabled={connectionStatus === 'disconnected'}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                End Session
              </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

// File Upload Popup Component
function FileUploadPopup({ onClose, onUpload, files }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };
  
  const handleChange = async (e) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files[0]) {
      await handleFileUpload(e.target.files[0]);
    }
  };
  
  const handleFileUpload = async (file) => {
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Upload Files
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-6">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive 
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FileUp className="h-10 w-10 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Supported formats: PDF, TXT, CSV, JSON, images
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleChange}
              accept=".pdf,.txt,.csv,.json,.jpg,.jpeg,.png"
            />
            <button
              disabled={uploading}
              onClick={() => fileInputRef.current.click()}
              className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Select File'}
            </button>
          </div>
          
          {/* File List */}
          {files.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Uploaded Files</h3>
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {files.map((file, idx) => (
                  <li 
                    key={idx} 
                    className="text-xs flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                  >
                    <div className="truncate flex-1">{file.name}</div>
                    <div className="text-gray-500 dark:text-gray-400">{file.type}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}