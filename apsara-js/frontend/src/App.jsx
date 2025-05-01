import React, { useState, useEffect, useRef } from 'react';
import { BellRing, FileUp, Menu, Mic, Moon, Send, Settings, Sun, User, X, MessageSquare, UploadCloud, AudioLines, Cog, Trash2, MicOff, BrainCircuit, Image as ImageIcon, BookOpen } from 'lucide-react';

const BACKEND_URL = 'http://localhost:9000';

const MAX_LOCALSTORAGE_SIZE_MB = 4.5; // Set a limit slightly below 5MB
const BYTES_PER_MB = 1024 * 1024;
const MAX_STORAGE_BYTES = MAX_LOCALSTORAGE_SIZE_MB * BYTES_PER_MB;

// Define suggested prompts with optional target models
const suggestedPrompts = [
  { text: "Explain quantum computing simply", icon: BrainCircuit },
  { text: "Write a Python script for web scraping", icon: BrainCircuit, modelId: "gemini-2.5-pro-preview-03-25" }, // Example specific model
  { text: "Create a recipe for vegan lasagna", icon: BookOpen },
  { text: "Generate an image of a futuristic cityscape at sunset", icon: ImageIcon, modelId: "gemini-2.0-flash-exp-image-generation" },
  { text: "Summarize the theory of relativity", icon: BookOpen },
  { text: "Plan a 5-day itinerary for Tokyo", icon: BookOpen },
  { text: "Generate an image of a cat wearing sunglasses", icon: ImageIcon, modelId: "gemini-2.0-flash-exp-image-generation" },
  { text: "Debug this Javascript code snippet:\n```javascript\nfunction greet(name) {\n console.log(Hello, + name)\n}\n```", icon: BrainCircuit, modelId: "gemini-2.5-pro-preview-03-25" },
];

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
  // Live Settings Panel state
  const [liveSettingsOpen, setLiveSettingsOpen] = useState(false); // REMOVED - No longer needed as separate panel
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [liveSystemInstruction, setLiveSystemInstruction] = useState('You are a helpful assistant.'); // State for live system prompt

  // Determine if system instruction is applicable for the current model
  const isSystemInstructionApplicable = currentModel !== 'gemini-2.0-flash-exp-image-generation';

  // Add new generation settings state
  const [temperature, setTemperature] = useState(0.7);
  const [maxOutputTokens, setMaxOutputTokens] = useState(8192);
  const [enableGoogleSearch, setEnableGoogleSearch] = useState(false);
  const [enableCodeExecution, setEnableCodeExecution] = useState(false); // Example state

  // --- New Live Settings State ---
  const [liveModality, setLiveModality] = useState('AUDIO');

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

  // --- Realtime Audio Input State ---
  const [isRecording, setIsRecording] = useState(false); // Ensure this line is present and correct
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  // ----------------------------------

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

  // Live chat connection setup - Pass System Instruction
  const setupLiveConnection = (voiceName = currentVoice, modality = liveModality, systemInstruction = liveSystemInstruction) => { // Added systemInstruction param
     setLiveConnectionStatus('connecting');
     setLiveMessages([]); // Clear previous messages
     addLiveMessage({ role: 'system', text: 'Preparing live session...' });

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
     const params = new URLSearchParams();
     params.append('modalities', modality);
     if (modality === 'AUDIO' && voiceName) {
       params.append('voice', voiceName);
     }
     // --- Add System Instruction to Params ---
     if (systemInstruction && systemInstruction.trim()) {
         params.append('systemInstruction', encodeURIComponent(systemInstruction.trim()));
     }
     // ----------------------------------------
     const wsUrl = `${protocol}//${window.location.host}/live?${params.toString()}`;

     console.log(`[Live Setup] Connecting to: ${wsUrl} (Voice: ${modality === 'AUDIO' ? voiceName : 'N/A'}, Modality: ${modality}, SysPrompt: ${!!systemInstruction})`);
     addLiveMessage({ role: 'system', text: 'Initiating connection...' });

    const ws = new WebSocket(wsUrl);
     setLiveWsConnection(ws);
    
    // ... ws.onopen, ws.onmessage, ws.onerror, ws.onclose (no changes needed from previous version) ...
    ws.onopen = () => {
       console.log('[Live WS] Browser-Backend WS Connection established (onopen fired)');
       addLiveMessage({ role: 'system', text: 'Browser-Backend WS connection established. Waiting for backend...' });
       // Note: 'connected' event now comes from backend after Google session is open
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // console.log('[Live WS] Message received (raw):', data); // Verbose

         if (data.event === 'backend_connected') {
            addLiveMessage({ role: 'system', text: 'Backend acknowledged. Connecting to AI...' });
        } else if (data.event === 'connected') {
            addLiveMessage({ role: 'system', text: 'Live connection to AI active.' });
            setLiveConnectionStatus('connected');
        } else if (data.event === 'error') {
            console.error('[Live WS] Backend/Google Error:', data.message);
            addLiveMessage({ role: 'error', text: `Error: ${data.message}` });
            setLiveConnectionStatus('error');
             // Stop recording on error
             if (isRecording) stopRecording();
        } else if (data.event === 'closed') {
             addLiveMessage({ role: 'system', text: `Live AI connection closed. ${data.reason || ''}` });
             // ws.onclose handles final status update
         }
         else if (data.serverContent && data.serverContent.modelTurn && Array.isArray(data.serverContent.modelTurn.parts)) {
             let receivedText = '';
             let audioChunkReceived = false;
             for (const part of data.serverContent.modelTurn.parts) {
                 if (part.text) {
                     receivedText += part.text;
                 } else if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
                      if (liveModality === 'AUDIO') {
                        if (!audioContextRef.current) initAudioContext();
                        if (audioContextRef.current) {
                      try {
                         const mimeMatch = part.inlineData.mimeType.match(/rate=(\d+)/);
                               const sampleRate = mimeMatch ? parseInt(mimeMatch[1], 10) : 24000;
                                if (audioContextRef.current.sampleRate !== sampleRate) {
                                    console.warn(`[Audio] Sample rate mismatch! Reinit context.`);
                                    closeAudioContext();
                                    try {
                                        audioContextRef.current = new AudioContext({ sampleRate });
                                        console.log(`[Audio] Context reinit rate: ${sampleRate}`);
                                    } catch (ctxError) { /* ... error handling ... */ continue; }
                                }
                         const binaryString = window.atob(part.inlineData.data);
                         const len = binaryString.length;
                         const bytes = new Uint8Array(len);
                               for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
                         const arrayBuffer = bytes.buffer;
                         audioQueueRef.current.push(arrayBuffer);
                               audioChunkReceived = true;
                               playAudioQueue();
                             } catch (decodeError) { /* ... error handling ... */ }
                           } else { /* ... error handling ... */ }
                       } else { /* ... log ignored audio chunk ... */ }
                 }
             }
             if (receivedText) {
                  // ... update live messages with text ...
                 setLiveMessages(prevMessages => { /* ... existing logic ... */ return [...prevMessages, { role: 'model', text: receivedText, id: Date.now() + Math.random() }]; });
             } else if (audioChunkReceived && liveModality === 'AUDIO') {
                 // ... update live messages with audio placeholder ...
                  setLiveMessages(prevMessages => { /* ... existing logic ... */ return [...prevMessages, { role: 'system', icon: AudioLines, text: '(Receiving audio...)', id: Date.now() + Math.random() }];});
                    }
         }
         // Handle other potential message types from live.txt if needed (ToolCall, etc.)
         else if (data.serverToolCall) {
             console.warn("[Live WS] Received tool call:", data.serverToolCall);
             addLiveMessage({ role: 'system', text: `Received tool call: ${data.serverToolCall.functionCalls?.[0]?.name || 'unknown'}` });
             // TODO: Implement tool call handling if needed in live mode
         }

      } catch (err) { /* ... error handling ... */ }
    };
    
    ws.onerror = (error) => {
        console.error('[Live WS] WebSocket error event:', error);
        addLiveMessage({ role: 'error', text: 'WebSocket connection error. Check console.' });
        setLiveConnectionStatus('error');
        closeAudioContext();
         if (isRecording) stopRecording(); // Stop recording on error
    };
    
    ws.onclose = (event) => {
        console.log(`[Live WS] Connection closed. Code: ${event.code}, Reason: "${event.reason}"`);
        setLiveConnectionStatus(prevStatus => prevStatus === 'error' ? 'error' : 'disconnected');
        addLiveMessage({ role: 'system', text: `Live session ended. (Code: ${event.code})` });
        setLiveWsConnection(null);
        closeAudioContext();
        if (isRecording) stopRecording(); // Ensure recording stops
     };
   };

   // Start Live Session - Uses current state values
   const startLiveSession = () => {
       endLiveSession(); // Cleanup previous
       if (liveModality === 'AUDIO') initAudioContext();
       // Pass current state values to setup
       setupLiveConnection(currentVoice, liveModality, liveSystemInstruction);
   };

   // End Live Session - Includes stopping recording
   const endLiveSession = () => {
       if (isRecording) stopRecording(); // Stop recording if active
       if (liveWsConnection) {
           addLiveMessage({ role: 'system', text: 'Closing connection...' });
           liveWsConnection.close();
           setLiveWsConnection(null);
       }
       closeAudioContext();
       setLiveConnectionStatus('disconnected'); // Ensure status is updated
   };

    // Send Live Text Message
    const sendLiveMessage = (text) => {
       if (!liveWsConnection || liveConnectionStatus !== 'connected' || !text.trim()) { /* ... */ return; }
       try {
           // Use sendClientContent for text
           liveWsConnection.send(text); // Backend currently expects raw text for sendClientContent path
           // Alternatively, structure it like the SDK expects if backend changes:
           // const message = JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true } });
           // liveWsConnection.send(message);
           addLiveMessage({ role: 'user', text: text });
       } catch (e) { /* ... error handling ... */ }
    };

    // --- Realtime Audio Input Functions ---
    const startRecording = async () => {
        if (isRecording || !liveWsConnection || liveConnectionStatus !== 'connected') return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = []; // Clear previous chunks

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    // Send chunks immediately via WebSocket
                    if (liveWsConnection && liveWsConnection.readyState === WebSocket.OPEN) {
                        liveWsConnection.send(event.data); // Send Blob directly
                    }
                }
            };

            mediaRecorderRef.current.onstop = () => {
                // Optionally process final blob if needed, but chunks are sent live
                stream.getTracks().forEach(track => track.stop()); // Stop microphone access
                console.log('[Audio Input] Recording stopped.');
            };

            mediaRecorderRef.current.onerror = (event) => {
                console.error('[Audio Input] MediaRecorder error:', event.error);
                setAudioError(`Recording error: ${event.error.name}`);
                setIsRecording(false);
                 stream.getTracks().forEach(track => track.stop());
            };

            // Start recording and send chunks periodically (e.g., every 500ms)
            mediaRecorderRef.current.start(500);
            setIsRecording(true);
            addLiveMessage({ role: 'system', icon: Mic, text: 'Recording started...' });
            console.log('[Audio Input] Recording started.');

        } catch (err) {
            console.error('[Audio Input] Error accessing microphone:', err);
            setAudioError(`Mic access error: ${err.message}`);
            addLiveMessage({ role: 'error', text: `Mic access denied: ${err.message}` });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            addLiveMessage({ role: 'system', icon: MicOff, text: 'Recording stopped.' });
            // Stream tracks are stopped in onstop handler
       }
    };
    // --------------------------------------

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

  // --- NEW: Function to Start Chat from Prompt ---
  const startChatWithPrompt = async (promptText, targetModelId = null) => {
     // 1. Create New Conversation
     const id = Date.now().toString();
     const newConvo = { id, title: promptText.substring(0, 30) + (promptText.length > 30 ? '...' : ''), messages: [] };
     setConvos(prev => [newConvo, ...prev]);
     setActiveConvoId(id);

     // 2. Set Model if specified
     if (targetModelId && models.some(m => m.id === targetModelId)) {
        setCurrentModel(targetModelId);
        console.log(`Switching model to ${targetModelId} for prompt.`);
     } else if (targetModelId) {
         console.warn(`Target model ${targetModelId} not found, using current model ${currentModel}.`);
     }

     // 3. Close sidebar if on mobile
     if (window.innerWidth < 1024) closeSidebar();

     // 4. Add user message to state (without waiting for API)
     // Need to update state slightly differently since sendToBackend/startStreamChat will add it again
     // Let's modify send/stream functions slightly OR just trigger send/stream directly
     console.log(`Starting chat with prompt: "${promptText}"`);

     // Use a small delay to allow state updates to settle before sending
     setTimeout(() => {
         // Decide whether to stream or not based on current setting (or default to non-streaming?)
         const streamToggle = document.getElementById('streamToggleInput'); // Need to add an ID
         if (streamToggle?.checked) {
            startStreamChat(promptText);
         } else {
            sendToBackend(promptText);
         }
     }, 100); // Small delay
  };
  // ---------------------------------------------

  return (
    <div className="relative flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans overflow-hidden">
      {/* Sidebar Overlay */}
      {isSidebarOpen && !liveSettingsOpen && !settingsOpen && (
        <div
           onClick={closeSidebar}
           className="fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden"
           aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`absolute lg:relative inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col h-full z-40
                   transform transition-transform duration-300 ease-in-out
                   ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
         {/* Close button */}
         <button
           onClick={closeSidebar}
           className="absolute top-3 right-3 p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden transition-colors group"
           aria-label="Close sidebar"
         >
           <X className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
         </button>

        {/* App Title */}
        <div className="p-4 text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center gap-2 shadow-md">
          <BellRing className="h-5 w-5" />
          <span>Apsara 2.5</span>
        </div>
        
        {/* New Chat Button */}
        <button
          className="flex items-center justify-center gap-2 mx-4 my-3 p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-150 ease-in-out group shadow hover:shadow-md"
          onClick={() => {
            const id = Date.now().toString();
            setConvos([{ id, title: 'New Chat', messages: [] }, ...convos]);
            setActiveConvoId(id);
            if (window.innerWidth < 1024) closeSidebar();
          }}
        >
          <span className="text-lg transition-transform duration-150 ease-in-out group-hover:scale-110">+</span> New Chat
        </button>
        
        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 custom-scrollbar"> {/* Added custom-scrollbar */}
           <div className="my-0 flex justify-between items-center px-2 py-2 sticky top-0 bg-white dark:bg-gray-800 z-10"> {/* Sticky header */}
             <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Conversations
             </div>
             {convos.length > 0 && (
                <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
                        setConvos([]);
                        setActiveConvoId(null);
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors group"
                    title="Delete all conversations"
                  >
                     <Trash2 className="h-3 w-3 transition-transform duration-150 ease-in-out group-hover:scale-110" />
                     <span>Delete All</span>
                 </button>
               )}
          </div>
          <ul className="space-y-1 pb-2"> {/* Added padding-bottom */}
          {convos.map(c => (
          <li
            key={c.id}
            // Improved styling and group for hover effect
            className={`px-3 py-2 rounded-md cursor-pointer transition-all duration-150 ease-in-out flex justify-between items-center group ${
              c.id === activeConvoId 
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium shadow-sm'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <div 
                  className="flex items-center flex-1 min-w-0 mr-2" // Added margin-right
                  onClick={() => {
                      setActiveConvoId(c.id);
                      if (window.innerWidth < 1024) closeSidebar();
                  }}
                >
                 {/* Icon indicator for active chat */}
                 <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 transition-colors ${c.id === activeConvoId ? 'bg-indigo-500' : 'bg-gray-400 dark:bg-gray-600 group-hover:bg-indigo-400'}`}></div>
              <div className="truncate text-sm">{c.title}</div>
            </div>
            <button 
              onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete chat "${c.title}"?`)) {
                setConvos(prev => prev.filter(convo => convo.id !== c.id));
                    if (activeConvoId === c.id) {
                       const remainingConvos = convos.filter(convo => convo.id !== c.id);
                       setActiveConvoId(remainingConvos.length > 0 ? remainingConvos[0].id : null);
                        }
                    }
                  }}
                  // Control visibility and add animation
                  className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 ease-in-out hover:scale-110 focus:outline-none focus:ring-1 focus:ring-red-500 rounded-full"
              title="Delete conversation"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
          </ul>
        </div>
        
        {/* User info */}
        <div className="mt-auto border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-200 to-purple-200 dark:from-indigo-700 dark:to-purple-700 flex items-center justify-center ring-1 ring-inset ring-gray-300 dark:ring-gray-600">
                <User className="h-4 w-4 text-indigo-700 dark:text-indigo-200" />
              </div>
              <span className="text-sm font-medium">shubharthak</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out bg-gray-100 dark:bg-gray-900"> {/* Ensure main bg color */}
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10 py-2 px-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
             {/* Hamburger Menu Button */}
             <button
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all duration-150 ease-in-out lg:hidden group"
               aria-label="Toggle sidebar"
             >
               <Menu className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
             </button>

             {/* Spacer */}
             <div className="hidden lg:block w-8"></div>

            {/* Model Select */}
            <div className="flex items-center space-x-4 flex-shrink min-w-0"> {/* Allow shrinking */}
              <div className="flex items-center flex-shrink min-w-0 mx-2">
                <label htmlFor="modelSelect" className="text-sm font-medium mr-2 flex-shrink-0 text-gray-600 dark:text-gray-400">Model:</label>
                <select
                  id="modelSelect"
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md p-1 bg-white dark:bg-gray-700 truncate focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
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
            {/* --- RE-ADDED Dark Mode Button & Fixed Hover Effects --- */}
            <div className="flex items-center space-x-2 sm:space-x-3"> {/* Increased space */}
                {/* Theme Toggle */}
                <button
                   onClick={() => setDarkMode(!darkMode)}
                   className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all duration-150 ease-in-out group"
                   title="Toggle Theme"
                 >
                   {darkMode ? <Sun className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110 group-hover:rotate-180" /> : <Moon className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110 group-hover:-rotate-12" />}
              </button>

                {/* Live Button */}
                 <button
                   onClick={() => setLiveOpen(true)}
                   className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400 transition-all duration-150 ease-in-out group"
                   title="Start Live Session"
                 >
                    {/* Ensured group-hover targets the icon */}
                   <MessageSquare className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
              </button>

                {/* Settings Button */}
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-150 ease-in-out group"
                  title="Chat Settings"
                 >
                    {/* Ensured group-hover targets the icon */}
                   <Settings className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110 group-hover:rotate-45" />
              </button>
            </div>
          </div>
        </header>
        
        {/* Chat Messages Area */}
        {/* --- UPDATED: Welcome Screen Styling --- */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900 custom-scrollbar"> {/* Added custom-scrollbar */}
          {activeConvoId && convos.find(c => c.id === activeConvoId) ? (
            <ChatWindow convo={convos.find(c => c.id === activeConvoId)} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 px-4">
              <div className="mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center ring-4 ring-white/50 dark:ring-white/10 shadow-lg">
                <BellRing className="h-10 w-10 text-indigo-500 dark:text-indigo-400" />
              </div>
              {/* Added shimmer animation class */}
              <h3 className="text-3xl font-bold mb-3 animate-shimmer">
                Welcome to Apsara 2.5
              </h3>
              <p className="max-w-lg mb-8 text-base text-gray-600 dark:text-gray-400">
                Your intelligent assistant. Start a new chat or select one from the sidebar.
              </p>
              {/* Styled Example Prompts */}
              <div className="mb-8 w-full max-w-xl">
                 <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Try asking:</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
                     {suggestedPrompts.slice(0, 4).map((prompt, index) => { // Show first 4 initially
                        const Icon = prompt.icon || BrainCircuit; // Default icon
                        return (
              <button 
                                key={index}
                                onClick={() => startChatWithPrompt(prompt.text, prompt.modelId)}
                                className="flex items-center text-left px-4 py-3 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/80 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-all shadow-sm hover:shadow-lg transform hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-700 group"
                            >
                                <Icon className="h-5 w-5 mr-3 text-indigo-500 dark:text-indigo-400 flex-shrink-0 transition-transform group-hover:scale-110" />
                                <span className="flex-1">{prompt.text.split('\n')[0]}</span> {/* Show first line */}
                            </button>
                        );
                      })}
                 </div>
              </div>
              <button
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 ease-in-out group shadow-md hover:shadow-lg transform hover:scale-105"
                onClick={() => {
                  const id = Date.now().toString();
                  setConvos([{ id, title: 'New Chat', messages: [] }, ...convos]);
                  setActiveConvoId(id);
                }}
              >
                <span className="font-semibold">Start New Chat</span>
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

      {/* Settings Panel - Ensure it renders conditionally */}
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

      {/* Live Chat Popup - Ensure it renders conditionally */}
      {liveOpen && (
        <LivePopup 
          connectionStatus={liveConnectionStatus}
          messages={liveMessages}
          currentVoice={currentVoice}
          voices={voices}
          onVoiceChange={setCurrentVoice}
          audioError={audioError}
          liveModality={liveModality}
          onModalityChange={setLiveModality}
          liveSystemInstruction={liveSystemInstruction}
          onSystemInstructionChange={setLiveSystemInstruction}
          onClose={() => {
              endLiveSession(); // Ensure session ends fully on close
              setLiveOpen(false);
          }}
          onStartSession={startLiveSession}
          onEndSession={endLiveSession}
          onSendMessage={sendLiveMessage}
          // Realtime audio handlers
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
        />
      )}

      {/* File Upload Popup - Ensure it renders conditionally */}
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
              disabled ? "Start a conversation first..." : 
              isLoading ? "Apsara is thinking..." : 
              "Type your message (Shift+Enter for new line)..."
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
            style={{ maxHeight: '150px', minHeight: '44px' }} // Ensure min-height
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
                  id="streamToggleInput" // <-- Added ID here
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
              title="Send Message"
            >
              <Send className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:translate-x-0.5 group-hover:scale-105" />
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center hidden sm:block">
          {useStreaming ? "Streaming mode: Responses appear in real-time." : "Tip: Shift+Enter for a new line."}
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
            Chat Settings
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
              className={`w-full p-3 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:border-gray-600 dark:text-gray-100 ${!isSystemInstructionApplicable ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60' : 'bg-white dark:bg-gray-700'}`}
              rows={5}
              value={isSystemInstructionApplicable ? tempInstruction : ''}
              onChange={(e) => isSystemInstructionApplicable && setTempInstruction(e.target.value)}
              placeholder={isSystemInstructionApplicable ? "Set the AI's behavior..." : "Not applicable for this model"}
              disabled={!isSystemInstructionApplicable}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {isSystemInstructionApplicable
                 ? "Sets the context and behavior for the AI (not used in Live mode)."
                 : "System instructions are not supported by the selected model."
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

// Live Chat Popup Component - Removed audio checkbox, use liveModality prop
function LivePopup({
    connectionStatus, messages, currentVoice, voices, onVoiceChange, audioError,
    liveModality, onModalityChange, liveSystemInstruction, onSystemInstructionChange,
    onClose, onStartSession, onEndSession, onSendMessage,
    isRecording, onStartRecording, onStopRecording // Mic handlers
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  // Local state for temp system instruction edit
  const [tempSystemInstruction, setTempSystemInstruction] = useState(liveSystemInstruction);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update temp instruction if prop changes (e.g., panel reopens)
  useEffect(() => {
     setTempSystemInstruction(liveSystemInstruction);
  }, [liveSystemInstruction]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  // Apply system instruction change before starting
  const handleStartSession = () => {
     onSystemInstructionChange(tempSystemInstruction); // Apply temp instruction to App state
     onStartSession();
  }

  // Helper to render messages with potential icon
  const renderMessageContent = (msg) => {
     if (msg.icon) {
        const IconComponent = msg.icon;
         // Make system messages less prominent
         const isSystem = msg.role === 'system';
         return (
            <span className={`flex items-center gap-1.5 ${isSystem ? 'opacity-80 italic' : ''}`}>
                <IconComponent className="h-4 w-4 inline-block opacity-70 flex-shrink-0" />
                <span>{msg.text}</span>
            </span>
         );
     }
     return msg.text;
  }

  const getStatusIndicator = () => {
    switch (connectionStatus) {
      case 'connecting': return <span className="text-yellow-500 flex items-center gap-1.5"><div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>Connecting...</span>;
      case 'connected': return <span className="text-green-500 flex items-center gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-full"></div>Connected</span>;
      case 'error': return <span className="text-red-500 flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500 rounded-full"></div>Error</span>;
      case 'disconnected': return <span className="text-gray-500 flex items-center gap-1.5"><div className="w-2 h-2 bg-gray-500 rounded-full"></div>Disconnected</span>;
      default: return null;
    }
  };

  const isSessionActive = connectionStatus === 'connected' || connectionStatus === 'connecting';
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl h-full max-h-[90vh] sm:max-h-[80vh] bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
            Apsara Live
          </h2>
          <div className="text-sm font-medium">{getStatusIndicator()}</div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
            <X className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
          </button>
        </div>
        
        {/* Message Display Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2 border rounded-md p-3 bg-gray-50 dark:bg-gray-900/50 custom-scrollbar">
           {/* Display Placeholder if no messages and disconnected */}
           {messages.length === 0 && !isSessionActive && (
             <div className="text-center text-gray-500 dark:text-gray-400 p-4">
                 Configure settings below and click "Start Session".
             </div>
           )}
           {messages.map((msg) => (
             <div
               key={msg.id}
               className={`flex ${
                 msg.role === 'user' ? 'justify-end' : 'justify-start'
               }`}
             >
               <div
                 className={`max-w-[85%] rounded-lg px-3 py-2 text-sm break-words ${
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
            {audioError && (
                <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-md text-center">
                    Audio Error: {audioError}
                </div>
            )}

            {/* --- Settings Area (Shown when disconnected) --- */}
            {!isSessionActive && (
              <div className="p-4 border rounded-lg bg-gray-100 dark:bg-gray-700/50 space-y-4">
                <h3 className="text-sm font-semibold text-center text-gray-700 dark:text-gray-300 mb-3">Live Session Settings</h3>
                {/* System Prompt */}
                <div>
                    <label htmlFor="liveSystemInstruction" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      System Instruction (for Live session)
                    </label>
                    <textarea
                      id="liveSystemInstruction"
                      rows={2}
                      className="w-full p-2 border rounded-md text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500"
                      value={tempSystemInstruction}
                      onChange={(e) => setTempSystemInstruction(e.target.value)}
                      placeholder="e.g., Respond concisely."
                    />
                 </div>
                 {/* Modality */}
                <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Response Mode</label>
                    <div className="flex space-x-4">
                        <label className="flex items-center space-x-1.5 cursor-pointer text-xs">
                            <input type="radio" name="liveModality" value="AUDIO" checked={liveModality === 'AUDIO'} onChange={() => onModalityChange('AUDIO')} className="text-indigo-600 focus:ring-indigo-500"/>
                            <span>Audio</span>
                  </label>
                        <label className="flex items-center space-x-1.5 cursor-pointer text-xs">
                             <input type="radio" name="liveModality" value="TEXT" checked={liveModality === 'TEXT'} onChange={() => onModalityChange('TEXT')} className="text-indigo-600 focus:ring-indigo-500"/>
                            <span>Text</span>
                        </label>
                    </div>
                </div>
                {/* Voice (Conditional) */}
                {liveModality === 'AUDIO' && (
                    <div>
                        <label htmlFor="liveVoiceSelect" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                           AI Voice
                        </label>
                        <select
                            id="liveVoiceSelect"
                            value={currentVoice}
                            onChange={(e) => onVoiceChange(e.target.value)}
                            className="w-full p-2 border rounded-md text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500"
                        >
                            {voices.length > 0 ? voices.map(v => (<option key={v} value={v}>{v}</option>)) : <option disabled>...</option>}
                        </select>
                    </div>
                )}
                {/* Start Button */}
                <div className="flex justify-end pt-2">
                 <button
                        onClick={handleStartSession} // Use handler that applies system prompt
                  disabled={connectionStatus === 'connecting'}
                        className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {connectionStatus === 'connecting' ? 'Connecting...' : 'Start Session'}
                </button>
                </div>
                </div>
            )}

            {/* --- Input Area (Shown when connected) --- */}
            {connectionStatus === 'connected' && (
                <div className="flex items-center gap-2">
                  {/* Microphone Button */}
                  <button
                    onClick={isRecording ? onStopRecording : onStartRecording}
                    className={`p-2 rounded-full transition-colors group ${
                      isRecording
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 animate-pulse'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title={isRecording ? 'Stop Recording' : 'Start Recording (Sends audio live)'}
                  >
                    {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5 transition-transform group-hover:scale-110" />}
                  </button>
                  {/* Text Input */}
                  <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                  className="w-full p-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Type a message or use the mic..."
                  disabled={connectionStatus !== 'connected'}
                  />
                  <button
                      onClick={handleSendMessage}
                  disabled={connectionStatus !== 'connected' || !inputText.trim()}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors group"
                      title="Send Message"
                  >
                      <Send className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
                  </button>
                  </div>
              </div>
            )}
          
            {/* End Session Button (Shown when active or error) */}
            {(isSessionActive || connectionStatus === 'error') && (
              <div className="flex justify-end">
              <button
                    onClick={onEndSession}
                    className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors"
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
       alert(`Upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
       // Clear the input value so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Attach Files
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
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
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
              Max file size: 50MB. PDF, TXT, Images, etc.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleChange}
              // Removed accept for now, let backend handle validation
              // accept=".pdf,.txt,.csv,.json,.jpg,.jpeg,.png,.webp"
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
                    <div className="truncate flex-1">{file.mimetype?.startsWith('image') ? '🖼️' : '📄'}</div>
                    <div className="text-gray-500 dark:text-gray-400">{file.originalname}</div>
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