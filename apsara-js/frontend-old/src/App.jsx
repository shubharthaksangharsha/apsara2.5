import React, { useState, useEffect, useRef } from 'react';
import { BellRing, FileUp, Menu, Mic, Moon, Send, Settings, Sun, User, X, MessageSquare, UploadCloud, AudioLines, Cog, Trash2, MicOff, BrainCircuit, Image as ImageIcon, BookOpen, Link as LinkIcon, UserIcon } from 'lucide-react';

const BACKEND_URL = 'http://localhost:9000';

const MAX_LOCALSTORAGE_SIZE_MB = 4.5; // Set a limit slightly below 5MB
const BYTES_PER_MB = 1024 * 1024;
const MAX_STORAGE_BYTES = MAX_LOCALSTORAGE_SIZE_MB * BYTES_PER_MB;

// Define suggested prompts with optional target models
const suggestedPrompts = [
  { text: "Explain quantum computing simply", icon: BrainCircuit },
  { text: "Write a Python script for web scraping", icon: BrainCircuit, modelId: "gemini-2.5-pro-exp-03-25" }, // Example specific model
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
  const [sidebarLocked, setSidebarLocked] = useState(false); // <-- Add this state
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
      const isLargeScreen = window.innerWidth >= 1024;
      if (isLargeScreen) {
        // Large screens: Start unlocked, visually collapsed state handled by width/classes
        setIsSidebarOpen(true); // Keep it technically "open" for layout flow
        setSidebarLocked(false); 
      } else {
        // Small screens: Start closed and unlocked
        setIsSidebarOpen(false);
        setSidebarLocked(false); 
      }
    };
    checkSize(); 
    window.addEventListener('resize', checkSize); 
    return () => window.removeEventListener('resize', checkSize); 
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
  const [isModelSpeaking, setIsModelSpeaking] = useState(false); // State for audio pulse

  // --- NEW: State to track the ID of the model message being streamed ---
  const [streamingModelMessageId, setStreamingModelMessageId] = useState(null);

  // --- State specifically for aggregating live text chunks ---
  const liveStreamingTextRef = useRef('');
  const liveStreamingMsgIdRef = useRef(null);
  // ----------------------------------------------------------

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
    // Add timestamp for potential sorting/debugging
    setLiveMessages(prev => [...prev, { ...msg, id: Date.now() + Math.random() * 1000, timestamp: Date.now() }]);
  };

  // Function to update an existing live message (for text streaming)
  const updateLiveMessage = (id, newText) => {
     setLiveMessages(prev => prev.map(m =>
        m.id === id ? { ...m, text: newText } : m
     ));
  };

  // --- Modified applyConfigSettings ---
  // Add an optional parameter to know if it's for image gen
  const applyConfigSettings = (config = {}, isImageGenCall = false) => {
     config.generationConfig = config.generationConfig || {};
     config.generationConfig.temperature = temperature;
     config.generationConfig.maxOutputTokens = maxOutputTokens;

     // Apply System Instruction only if applicable AND not an image gen call
     if (!isImageGenCall && isSystemInstructionApplicable) {
        config.systemInstruction = systemInstruction;
     } else {
         delete config.systemInstruction; // Ensure removed if image gen or not applicable
     }

     // Apply Tools (Search, Code Execution) only if not image gen call
     config.tools = config.tools || [];
     config.tools = config.tools.filter(tool => !tool.googleSearch && !tool.executableCode); // Start clean

     if (!isImageGenCall) { // Only add tools if not image gen
        if (enableGoogleSearch) {
           config.tools.push({ googleSearch: {} });
        }
        if (enableCodeExecution) {
           // config.tools.push({ executableCode: {} }); // Add if backend supports this structure
        }
     }

     if (config.tools.length === 0) delete config.tools;
     if (Object.keys(config.generationConfig).length === 0) delete config.generationConfig;

     return config;
      }
  // --- End modified applyConfigSettings ---

  // --- Modified sendToBackend ---
  const sendToBackend = async (text, targetConvoId = null, initialConvoData = null, targetModelId = null) => {
    const convoIdToUse = targetConvoId || activeConvoId;
    if (!convoIdToUse && !initialConvoData) {
      console.error("sendToBackend: No active conversation and no initial data provided.");
      return;
    }
    
    setIsLoading(true);
    let finalConvoId = convoIdToUse;
    let updatedConvoState = null;

    try {
      let activeConvo;
      let turns;

      // --- Handle initial convo creation from prompt ---
      if (initialConvoData) {
        finalConvoId = initialConvoData.id;
        activeConvo = initialConvoData; // Use the provided initial data
        turns = [{ role: 'user', parts: [{ text }] }]; // Only the first user turn

        // Immediately add the new convo and the user message to state
        updatedConvoState = prev => [
            { ...initialConvoData, messages: [{ role: 'user', parts: [{ text }] }] },
            ...prev.filter(c => c.id !== initialConvoData.id) // Ensure no duplicates if called rapidly
        ];
        setConvos(updatedConvoState);
        setActiveConvoId(finalConvoId); // Set active ID after adding convo
      } else {
        // --- Existing convo logic ---
        activeConvo = convos.find(c => c.id === convoIdToUse);
      if (!activeConvo) throw new Error('No active conversation found');
      
      const validMessages = (activeConvo.messages || [])
          .filter(msg => (msg.role === 'user' || msg.role === 'model') && msg.parts?.length > 0);
        turns = [...validMessages, { role: 'user', parts: [{ text }] }];
      
        // Update UI immediately with user message for existing convo
        updatedConvoState = prev => prev.map(c => {
            if (c.id !== convoIdToUse) return c;
            return { ...c, messages: [...(c.messages || []), { role: 'user', parts: [{ text }] }] };
        });
         setConvos(updatedConvoState);
      }

      // --- API Call ---
      const modelToUse = targetModelId || currentModel; // Use target model if provided
      // --- Check if it's an image gen model ---
      const isImageGen = modelToUse === 'gemini-2.0-flash-exp-image-generation';
      const baseRequestBody = {
        contents: turns,
        modelId: modelToUse,
        // --- Pass the flag to applyConfigSettings ---
        config: applyConfigSettings({}, isImageGen),
      };

      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseRequestBody),
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || data.error);
      
      // Process response
      const responseParts = [];
      if (typeof data.response === 'string') responseParts.push({ text: data.response });
      else if (Array.isArray(data.response)) responseParts.push(...data.response);
      else if (data.response?.parts) responseParts.push(...data.response.parts);
      else responseParts.push({ text: '(No response)' });

      const reply = { 
        role: 'model', 
        parts: responseParts,
        metadata: { finishReason: data.finishReason, usageMetadata: data.usageMetadata },
        id: Date.now() + Math.random(), // Add unique ID
      };
      
      // Update conversation with AI reply
      setConvos(prev => prev.map(c => {
        if (c.id !== finalConvoId) return c;
        return { ...c, messages: [...(c.messages || []), reply] };
      }));
      
      // Update title for new conversations (check if messages array only had the user prompt initially)
      const finalConvo = convos.find(c => c.id === finalConvoId) || activeConvo; // Get latest state if possible
      if (finalConvo && finalConvo.messages.length <= 1) { // If only user message exists before reply
         const newTitle = text.length > 30 ? text.substring(0, 30) + '...' : text;
         setConvos(prev => prev.map(c => c.id === finalConvoId ? { ...c, title: newTitle } : c));
      }

    } catch (err) {
      console.error('Chat error:', err);
      // Add error message
      setConvos(prev => prev.map(c => {
        if (c.id !== finalConvoId) return c;
        return { 
          ...c, 
          messages: [...(c.messages || []), { role: 'error', parts: [{ text: `Error: ${err.message}` }], id: Date.now() + Math.random() }],
        };
      }));
    } finally {
      setIsLoading(false);
    }
  };
  // --- End modified sendToBackend ---
  
  // --- Modified startStreamChat ---
  const startStreamChat = async (text, targetConvoId = null, initialConvoData = null, targetModelId = null) => {
    const convoIdToUse = targetConvoId || activeConvoId;
     if (!convoIdToUse && !initialConvoData) {
       console.error("startStreamChat: No active conversation and no initial data provided.");
       return;
     }
    
    setIsLoading(true);
    let finalConvoId = convoIdToUse;
    let tempModelMessageId = null; // Temporary ID for the message being built

    try {
       let activeConvo;
       let turns;

      // --- Handle initial convo creation from prompt ---
       if (initialConvoData) {
         finalConvoId = initialConvoData.id;
         activeConvo = initialConvoData;
         turns = [{ role: 'user', parts: [{ text }] }];

         tempModelMessageId = Date.now() + Math.random() + '_model'; // Unique ID
         setStreamingModelMessageId(tempModelMessageId); // Track the ID

         // Add new convo, user message, and placeholder model message
         setConvos(prev => [
             { ...initialConvoData, messages: [
                 { role: 'user', parts: [{ text }], id: Date.now() + Math.random() + '_user' },
                 { role: 'model', parts: [], id: tempModelMessageId } // Placeholder model msg
             ] },
             ...prev.filter(c => c.id !== initialConvoData.id)
         ]);
          setActiveConvoId(finalConvoId);
       } else {
          // --- Existing convo logic ---
         activeConvo = convos.find(c => c.id === convoIdToUse);
      if (!activeConvo) throw new Error('No active conversation found');
      
      const validMessages = (activeConvo.messages || [])
           .filter(msg => (msg.role === 'user' || msg.role === 'model') && msg.parts?.length > 0);
         turns = [...validMessages, { role: 'user', parts: [{ text }] }];
      
         tempModelMessageId = Date.now() + Math.random() + '_model';
         setStreamingModelMessageId(tempModelMessageId);

         // Add user message and placeholder model message
      setConvos(prev => prev.map(c => {
           if (c.id !== convoIdToUse) return c;
        return { 
          ...c, 
             messages: [
               ...(c.messages || []),
               { role: 'user', parts: [{ text }], id: Date.now() + Math.random() + '_user' },
               { role: 'model', parts: [], id: tempModelMessageId } // Placeholder
             ]
        };
      }));
       }

       // --- API Call ---
       const modelToUse = targetModelId || currentModel;
       // --- Check if it's an image gen model ---
       const isImageGen = modelToUse === 'gemini-2.0-flash-exp-image-generation';
      const baseRequestBody = {
        contents: turns,
         modelId: modelToUse,
         // --- Pass the flag to applyConfigSettings ---
         config: applyConfigSettings({}, isImageGen),
      };

      const response = await fetch(`${BACKEND_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseRequestBody)
      });

      if (!response.ok) { // Check for HTTP errors before trying to read body
          const errorData = await response.json().catch(() => ({ error: { message: `HTTP error! status: ${response.status}` } }));
          throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      // --- NEW: Buffer for incomplete lines ---
      let lineBuffer = ''; 
      // --- End New Buffer ---
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Append new chunk to buffer
        lineBuffer += decoder.decode(value, { stream: true }); 

        // --- UPDATED: Process buffer line by line ---
        let lines = lineBuffer.split('\n\n');
        
        // Keep the last potentially incomplete line in the buffer
        lineBuffer = lines.pop() || ''; 

        for (const line of lines) { // Process only complete lines
          if (!line.trim()) continue;
          
          // --- Process 'data:' events ---
          if (line.startsWith('data: ')) {
            const jsonData = line.slice(6);
            try {
              const data = JSON.parse(jsonData); // Try parsing the complete line data
              
              // --- Handle parsed data (text, image, finishReason) ---
              // (Logic from previous step for updating convos state based on data.text, data.inlineData, data.finishReason goes here)
              if (data.text || (data.inlineData && data.inlineData.mimeType?.startsWith('image/'))) {
                   setConvos(prevConvos => prevConvos.map(c => { 
                      if (c.id !== finalConvoId) return c;
                      const updatedMessages = c.messages.map(m => {
                          if (m.id === tempModelMessageId) {
                              let currentParts = m.parts ? [...m.parts] : []; 
              if (data.text) {
                                  const lastPartIndex = currentParts.length - 1;
                                  if (lastPartIndex >= 0 && typeof currentParts[lastPartIndex] === 'object' && 'text' in currentParts[lastPartIndex]) {
                                      currentParts[lastPartIndex] = { ...currentParts[lastPartIndex], text: currentParts[lastPartIndex].text + data.text };
                } else {
                                      currentParts.push({ text: data.text });
                                  }
                              }
                              if (data.inlineData && data.inlineData.mimeType?.startsWith('image/')) {
                                  currentParts.push({ inlineData: data.inlineData });
                              }
                              return { ...m, parts: currentParts };
                          }
                          return m; 
                      });
                      return { ...c, messages: updatedMessages };
                }));
              }
              
              if (data.finishReason) {
                 setConvos(prevConvos => prevConvos.map(c => { 
                    if (c.id !== finalConvoId) return c;
                     let messageFinalized = false;
                     const finalMessages = c.messages.map(m => {
                       if (m.id === tempModelMessageId) {
                           messageFinalized = true;
                          const finalParts = m.parts && m.parts.length > 0 ? m.parts : [{ text: '(Empty or No Response)' }]; 
                          return {
                             ...m,
                             parts: finalParts, 
                      metadata: {
                        finishReason: data.finishReason,
                               usageMetadata: data.usageMetadata // Assume usage comes with finishReason chunk
                             }
                           };
                       }
                       return m;
                     });
                     if (!messageFinalized) {
                        console.error("Streaming completion event: Couldn't find message with ID", tempModelMessageId, "to finalize.");
                     }
                     let finalTitle = c.title;
                     const userPrompt = turns.find(turn => turn.role === 'user');
                     const userPromptText = userPrompt?.parts?.[0]?.text;
                     if (c.title === 'New Chat' && userPromptText) {
                         finalTitle = userPromptText.length > 30 ? userPromptText.substring(0, 30) + '...' : userPromptText;
                     }
                   return { ...c, title: finalTitle, messages: finalMessages };
                 }));
                 setStreamingModelMessageId(null); 
              }
             // --- End handling parsed data ---

            } catch (e) { 
              // --- Log the specific line that failed ---
              console.error('Error parsing stream data:', e, "Problematic JSON data:", jsonData); 
              // Continue processing next lines, don't crash the loop
            }
          } 
          // --- Process 'event:' lines (done, error, etc.) ---
          else if (line.startsWith('event: done')) {
             // (Keep existing logic for event: done)
             setConvos(prevConvos => prevConvos.map(c => { 
                if (c.id === finalConvoId && c.title === 'New Chat') {
                     const userPrompt = turns.find(turn => turn.role === 'user');
                     const userPromptText = userPrompt?.parts?.[0]?.text;
                    if (userPromptText) {
                       const newTitle = userPromptText.length > 30 ? userPromptText.substring(0, 30) + '...' : userPromptText;
                       return { ...c, title: newTitle };
                    }
                }
                return c;
             }));
             setStreamingModelMessageId(null);
             break; // Exit the inner line processing loop (though outer loop should also terminate)
          } else if (line.startsWith('event: error')) {
              // (Keep existing logic for event: error)
               setStreamingModelMessageId(null);
               try {
                   const errorPayload = line.slice(line.indexOf(':') + 1);
                   const errorData = JSON.parse(errorPayload);
                   throw new Error(errorData.error || 'Unknown stream error event');
            } catch (e) {
                   throw new Error(e.message || 'Failed to parse stream error event');
               }
          }
        } // --- End for...of lines ---
      } // --- End while(true) ---
      
      // Add a final check for any remaining data in the buffer after the loop finishes
      // This might contain the very last 'finishReason' data if it wasn't followed by \n\n
      if (lineBuffer.startsWith('data: ')) {
           const jsonData = lineBuffer.slice(6);
           try {
                const data = JSON.parse(jsonData);
                if (data.finishReason) {
                    // Apply final metadata update logic one last time
                    setConvos(prevConvos => prevConvos.map(c => {
                        if (c.id !== finalConvoId) return c;
                        const finalMessages = c.messages.map(m => {
                          if (m.id === tempModelMessageId) {
                             const finalParts = m.parts && m.parts.length > 0 ? m.parts : [{ text: '(Empty or No Response)' }];
                             return { ...m, parts: finalParts, metadata: { finishReason: data.finishReason, usageMetadata: data.usageMetadata } };
                          } return m; });
                        let finalTitle = c.title;
                        const userPrompt = turns.find(turn => turn.role === 'user');
                        const userPromptText = userPrompt?.parts?.[0]?.text;
                        if (c.title === 'New Chat' && userPromptText) { finalTitle = userPromptText.length > 30 ? userPromptText.substring(0, 30) + '...' : userPromptText; }
                        return { ...c, title: finalTitle, messages: finalMessages };
                   }));
                   setStreamingModelMessageId(null);
                }
           } catch (e) {
               console.error('Error parsing final buffer data:', e, "Final buffer data:", jsonData);
           }
      }


    } catch (err) {
       // (Keep existing catch block logic)
      console.error('Stream chat error:', err);
       setConvos(prevConvos => prevConvos.map(c => { 
          if (c.id !== finalConvoId) return c;
          let messageFound = false;
          const messagesWithError = c.messages.map(m => {
             if (m.id === tempModelMessageId) {
                 messageFound = true;
                 return { role: 'error', parts: [{ text: `Stream Error: ${err.message}` }], id: tempModelMessageId + '_error' }; 
             } return m; });
          if (!messageFound) { messagesWithError.push({ role: 'error', parts: [{ text: `Stream Error: ${err.message}` }], id: Date.now() + Math.random() + '_error' }); }
          return { ...c, messages: messagesWithError };
       }));
       setStreamingModelMessageId(null); 
    } finally {
      setIsLoading(false);
       setStreamingModelMessageId(null); // Ensure ID is always cleared
    }
  };
  // --- End modified startStreamChat ---

  // --- Modified startChatWithPrompt ---
  const startChatWithPrompt = async (promptText, targetModelId = null) => {
    // 1. Create initial convo data (without adding to state yet)
    const id = Date.now().toString();
    const title = promptText.length > 30 ? promptText.substring(0, 30) + '...' : promptText;
    const initialConvoData = { id, title, messages: [] }; // Keep messages empty initially

    // 2. Set Model if specified (optimistically)
    if (targetModelId && models.some(m => m.id === targetModelId)) {
       setCurrentModel(targetModelId); // Update model selector UI
       console.log(`Switching model to ${targetModelId} for prompt.`);
    } else if (targetModelId) {
       console.warn(`Target model ${targetModelId} not found, using current model ${currentModel}.`);
       targetModelId = currentModel; // Fallback to current model for the API call
    } else {
        targetModelId = currentModel; // Use current if none specified
    }

    // 3. Close sidebar if on mobile
    if (window.innerWidth < 1024) closeSidebar();

    // 4. Call the appropriate send function, passing initial data
    console.log(`Starting chat with prompt: "${promptText}"`);
    const streamToggle = document.getElementById('streamToggleInput');
    if (streamToggle?.checked) {
        // Pass initialConvoData, targetConvoId=id, targetModelId
       await startStreamChat(promptText, id, initialConvoData, targetModelId);
    } else {
       await sendToBackend(promptText, id, initialConvoData, targetModelId);
    }
  };
  // ----------------------------------

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
     liveStreamingTextRef.current = ''; // Reset text aggregator
     liveStreamingMsgIdRef.current = null; // Reset streaming ID tracker

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
        // console.log('[Live WS] Message received (parsed):', data); // More detailed log

         if (data.event === 'backend_connected') {
            addLiveMessage({ role: 'system', text: 'Backend acknowledged. Connecting to AI...' });
        } else if (data.event === 'connected') {
            addLiveMessage({ role: 'system', text: 'Live connection to AI active.' });
            setLiveConnectionStatus('connected');
        } else if (data.event === 'error') {
            console.error('[Live WS] Backend/Google Error Event:', data.message);
            addLiveMessage({ role: 'error', text: `Error: ${data.message || 'Unknown backend/Google error'}` });
            setLiveConnectionStatus('error');
             if (isRecording) stopRecording();
             setIsModelSpeaking(false);
             liveStreamingTextRef.current = '';
             liveStreamingMsgIdRef.current = null;
        } else if (data.event === 'closed') {
             addLiveMessage({ role: 'system', text: `Live AI connection closed. (Code: ${data.code || 'N/A'}, Reason: ${data.reason || 'N/A'})` });
             // ws.onclose handles final status update & cleanup
             setIsModelSpeaking(false);
             liveStreamingTextRef.current = '';
             liveStreamingMsgIdRef.current = null;
         }
         // --- Refined Server Content Handling ---
         else if (data.serverContent && data.serverContent.modelTurn && Array.isArray(data.serverContent.modelTurn.parts)) {
             let audioChunkReceivedThisMessage = false; // Track audio within *this specific message*

             for (const part of data.serverContent.modelTurn.parts) {
                 if (part.text) {
                      // --- Aggregate Live Text ---
                      if (!liveStreamingMsgIdRef.current) {
                           // Start of a new streaming message
                           const newMsgId = Date.now() + Math.random() * 1000 + '_live_model';
                           liveStreamingMsgIdRef.current = newMsgId;
                           liveStreamingTextRef.current = part.text;
                           // Add placeholder message immediately
                           setLiveMessages(prev => [...prev, { role: 'model', text: liveStreamingTextRef.current, id: newMsgId, timestamp: Date.now() }]);
                      } else {
                           // Append to existing streaming message
                           liveStreamingTextRef.current += part.text;
                           // Update the existing message in state
                           updateLiveMessage(liveStreamingMsgIdRef.current, liveStreamingTextRef.current);
                      }
                      // --------------------------
                 } else if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
                      audioChunkReceivedThisMessage = true; // Mark audio in this message
                      if (liveModality === 'AUDIO') {
                         if (!isModelSpeaking) { // Only set true on the *first* chunk of a speaking turn
                            setIsModelSpeaking(true);
                            console.log('[Audio Pulse] Set isModelSpeaking = true');
                         }
                         if (!audioContextRef.current) initAudioContext();
                         if (audioContextRef.current) {
                           try {
                               // ... [audio processing and queueing logic - no change] ...
                         const mimeMatch = part.inlineData.mimeType.match(/rate=(\d+)/);
                                const sampleRate = mimeMatch ? parseInt(mimeMatch[1], 10) : 24000;
                                // ... rest of audio buffer creation and playing ...
                                if (audioContextRef.current.sampleRate !== sampleRate) { /* ... handle rate mismatch ... */ }
                         const binaryString = window.atob(part.inlineData.data);
                         const len = binaryString.length;
                         const bytes = new Uint8Array(len);
                                for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
                         const arrayBuffer = bytes.buffer;
                                if (audioContextRef.current?.state === 'running') {
                         audioQueueRef.current.push(arrayBuffer);
                                   playAudioQueue();
                                } else { console.warn('[Audio] Context not running, skipping queueing.'); }
                           } catch (decodeError) { console.error("[Audio] Error decoding/queuing audio chunk:", decodeError); setAudioError("Error processing received audio."); }
                           } else { setAudioError("Audio context not available for playback."); }
                       } else { console.log("[Live WS] Received audio chunk but modality is TEXT. Ignoring."); }
                 }
             } // End parts loop

             // --- Turn Completion Handling ---
             if (data.serverContent.turnComplete || data.serverContent.generationComplete) {
                  if (isModelSpeaking) { // Stop pulse if it was active
                      setIsModelSpeaking(false);
                      console.log('[Audio Pulse] Set isModelSpeaking = false (turn complete)');
                  }
                   // Reset live text streaming tracker for the next turn
                   liveStreamingTextRef.current = '';
                   liveStreamingMsgIdRef.current = null;
              }
             // ------------------------------

         } // End serverContent handling
         // Handle other potential message types from live.txt if needed (ToolCall, etc.)
         else if (data.serverToolCall) {
             console.warn("[Live WS] Received tool call:", data.serverToolCall);
             addLiveMessage({ role: 'system', text: `Received tool call: ${data.serverToolCall.functionCalls?.[0]?.name || 'unknown'}` });
             // TODO: Implement tool call handling if needed in live mode
                    } else {
             // Log unexpected message structures
             // console.log("[Live WS] Received unhandled message structure:", data);
         }

      } catch (err) {
         console.error('[Live WS] Error processing message:', err, 'Raw data:', event.data);
           addLiveMessage({ role: 'error', text: `Frontend error processing message: ${err.message}`});
      }
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
        setIsModelSpeaking(false); // Ensure speaking indicator stops
        liveStreamingTextRef.current = ''; // Reset text aggregator
        liveStreamingMsgIdRef.current = null; // Reset streaming ID tracker
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
      setIsModelSpeaking(false); // Ensure speaking indicator stops
   };

    // --- Updated Send Live Text Message ---
    const sendLiveMessage = (text) => {
       if (!liveWsConnection || liveConnectionStatus !== 'connected' || !text.trim()) {
            console.warn("sendLiveMessage: Cannot send, WS not connected or text empty.");
           return;
       }
       try {
           // Reset the live text streaming tracker *before* sending user message
           liveStreamingMsgIdRef.current = null;
           liveStreamingTextRef.current = '';
           console.log('[Live Send] Reset live stream tracker for new user message.');

           liveWsConnection.send(text);
           addLiveMessage({ role: 'user', text: text });
       } catch (e) {
            console.error('[Live WS] Error sending text message:', e);
            addLiveMessage({ role: 'error', text: `Error sending message: ${e.message}`});
            // Reset tracker on error too
            liveStreamingMsgIdRef.current = null;
            liveStreamingTextRef.current = '';
       }
    };
    // --- End Updated Send Live Text Message ---

    // --- Realtime Audio Input Functions ---
    const startRecording = async () => {
        if (isRecording || !liveWsConnection || liveConnectionStatus !== 'connected') {
             console.warn(`startRecording: Cannot start. isRecording=${isRecording}, connectionStatus=${connectionStatus}`);
             return;
        }
        addLiveMessage({ role: 'system', icon: Mic, text: 'Attempting to start recording...' });
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            addLiveMessage({ role: 'system', icon: Mic, text: 'Microphone access granted.' });

            const options = {
                 mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
                    ? 'audio/ogg;codecs=opus'
                    : ''
            };
            console.log(`[Audio Input] Using mimeType: ${options.mimeType || 'browser default'}`);
            if (!options.mimeType) {
                 addLiveMessage({ role: 'error', text: 'Browser does not support preferred audio formats (Opus in WebM/Ogg).' });
            }

            mediaRecorderRef.current = new MediaRecorder(stream, options);
            audioChunksRef.current = []; // Clear any old chunks

            mediaRecorderRef.current.ondataavailable = (event) => {
                // console.log(`[Audio Input] ondataavailable fired, size: ${event.data.size}`); // Debug log
                if (event.data.size > 0) {
                    if (liveWsConnection && liveWsConnection.readyState === WebSocket.OPEN) {
                        try {
                            liveWsConnection.send(event.data); // Send Blob directly
                            // console.log(`[Audio Input] Sent chunk, size: ${event.data.size}, type: ${event.data.type}`);
                        } catch (sendErr) {
                             console.error("[Audio Input] Error sending audio chunk:", sendErr);
                             addLiveMessage({ role: 'error', text: `Error sending audio data: ${sendErr.message}` });
                             // Stop recording if sending fails?
                             stopRecording();
                        }
     } else {
                         console.warn("[Audio Input] WS connection not open, cannot send audio chunk.");
                         // Stop recording if connection is lost during recording
                         stopRecording();
                    }
                }
            };

            mediaRecorderRef.current.onstop = () => {
                stream.getTracks().forEach(track => track.stop()); // Stop mic access
                console.log('[Audio Input] Recording stopped (MediaRecorder onstop).');
                // No need to add message here, already handled in stopRecording func
                audioChunksRef.current = []; // Clear buffer
            };

            mediaRecorderRef.current.onerror = (event) => {
                console.error('[Audio Input] MediaRecorder error:', event.error);
                addLiveMessage({ role: 'error', text: `MediaRecorder error: ${event.error.name} - ${event.error.message}` });
                setIsRecording(false); // Ensure state is updated
            };

            // Start recording; data sent via ondataavailable
            mediaRecorderRef.current.start(250); // Send chunks roughly every 250ms
            setIsRecording(true);
            addLiveMessage({ role: 'system', icon: Mic, text: 'Recording started.' });
            console.log('[Audio Input] Recording started.');

        } catch (err) {
            console.error('[Audio Input] Error starting recording:', err);
            let errorText = `Error starting recording: ${err.message}`;
            if (err.name === 'NotAllowedError') {
               errorText = 'Microphone permission denied. Please allow access in browser settings.';
            } else if (err.name === 'NotFoundError') {
                errorText = 'No microphone found.';
            }
            addLiveMessage({ role: 'error', text: errorText });
            setIsRecording(false); // Ensure recording state is false
        }
    };

    const stopRecording = () => {
        // Check both state and recorder existence
        if (mediaRecorderRef.current && isRecording) {
            console.log('[Audio Input] stopRecording called.');
            addLiveMessage({ role: 'system', icon: MicOff, text: 'Recording stopped.' });
            // Stop the recorder; onstop handler will clean up stream tracks
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {
                 console.error("[Audio Input] Error stopping MediaRecorder:", e);
            }
            setIsRecording(false); // Update state immediately
       } else {
            // If stopRecording is called but we weren't recording (e.g., error cleanup)
            if (mediaRecorderRef.current?.stream) {
                 mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
           console.log('[Audio Input] stopRecording called but not currently recording or recorder not init.');
           setIsRecording(false); // Ensure state is consistent
       }
    };
    // --------------------------------------

  // Function to close sidebar, only if not locked
  const closeSidebar = () => {
     // Only applicable for small screens via overlay click
     if (window.innerWidth < 1024) {
         setIsSidebarOpen(false);
     }
  };

  // --- Modified onClick for the *sidebar's* hamburger ---
  const handleSidebarHamburgerClick = () => {
    if (window.innerWidth < 1024) {
        setIsSidebarOpen(prev => !prev); 
    } else {
        // On large screens, this button only toggles lock
        setSidebarLocked(prev => !prev);
        setIsSidebarOpen(true); // Ensure it's visually open when locking
    }
  };
  // --- End Modified onClick ---

  return (
    <div className="relative flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans overflow-hidden">
      {/* Sidebar Overlay - Only for small screens */}
      {isSidebarOpen && window.innerWidth < 1024 && ( 
        <div
           onClick={closeSidebar}
           className="fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden"
           aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`relative inset-y-0 left-0 bg-white dark:bg-gray-800 shadow-lg flex flex-col h-full z-40 
                   transition-all duration-500 ease-in-out group 
                   ${isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full'} 
                   lg:translate-x-0 
                   ${sidebarLocked ? 'lg:w-64' : 'lg:w-20 hover:lg:w-64'} 
                   `}
      >
        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar"> 
           
           {/* Sidebar Hamburger/Lock Button */}
           {/* --- ADD hidden lg:flex to hide on mobile --- */}
           <div className="hidden lg:flex flex-shrink-0 px-3 pt-3 pb-2"> 
         <button
                onClick={handleSidebarHamburgerClick} 
                className={`p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all duration-150 ease-in-out ${sidebarLocked && window.innerWidth >= 1024 ? 'bg-indigo-100 dark:bg-indigo-900/30' : ''}`}
                aria-label={window.innerWidth < 1024 ? (isSidebarOpen ? "Close Menu" : "Open Menu") : (sidebarLocked ? "Unlock Sidebar" : "Lock Sidebar")} 
              >
                <Menu className="h-5 w-5" />
         </button>
           </div>

           {/* Animated App Title */}
           <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0 overflow-hidden"> 
                {/* Apply visibility logic to Bell Icon */}
                {/* <BellRing className={`h-6 w-6 text-indigo-500 dark:text-indigo-400 flex-shrink-0 transition-opacity duration-300 lg:opacity-0 ${sidebarLocked ? 'lg:opacity-100' : 'group-hover:lg:opacity-100'}`}/> */}
                {/* --- End Bell Icon --- */}
                <span 
                    className={`text-lg font-semibold whitespace-nowrap animate-shimmer transition-opacity duration-300 lg:opacity-0 ${sidebarLocked ? 'lg:opacity-100' : 'group-hover:lg:opacity-100'}`}
                    style={{ animationDuration: '3s' }} 
                >
                    Apsara 2.5
                </span>
        </div>
        
           {/* New Chat Button Container */}
           {/* --- Adjusted padding/margin, ensure full width in parent --- */}
           <div className="flex-shrink-0 px-4 py-2"> 
        <button
               // --- Apply conditional justification ---
               className={`flex items-center w-full gap-2 px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ease-in-out shadow hover:shadow-md 
                          ${sidebarLocked ? 'lg:justify-start' : 'lg:justify-center group-hover:lg:justify-start'} `} // Center icon when collapsed on lg
          onClick={() => {
            const id = Date.now().toString();
            setConvos([{ id, title: 'New Chat', messages: [] }, ...convos]);
            setActiveConvoId(id);
                      // Close sidebar only if on small screen and currently open
                      if (window.innerWidth < 1024 && isSidebarOpen) setIsSidebarOpen(false);
                      // Ensure sidebar is locked open if user clicks "New Chat" while unlocked on large screen? (Optional)
                      // if (window.innerWidth >= 1024 && !sidebarLocked) setSidebarLocked(true); 
               }}
             >
               <span className="text-lg flex-shrink-0">+</span> 
               {/* Text fades in/out - added w-0 when hidden on lg */}
               <span className={`transition-opacity duration-300 whitespace-nowrap 
                          ${sidebarLocked ? 'lg:opacity-100' : 'lg:opacity-0 lg:w-0 group-hover:lg:opacity-100 group-hover:lg:w-auto'} `}>
                  New Chat
               </span>
        </button>
           </div>
        
           {/* Conversations List - Wrapped header and list for visibility control */}
           {/* --- Container for header + list, content fades/clips --- */}
           <div className={`flex-1 px-2 overflow-hidden transition-opacity duration-300 lg:opacity-0 ${sidebarLocked ? 'lg:opacity-100' : 'group-hover:lg:opacity-100'}`}> {/* Use opacity for fade */}
             <div className="my-0 flex justify-between items-center px-2 py-2 sticky top-0 bg-white dark:bg-gray-800 z-10"> 
               <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Conversations
             </div>
             {convos.length > 0 && (
                <button
                    onClick={() => {
                        // --- FIX: Moved state updates inside confirm block ---
                        if (confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
                        setConvos([]);
                        setActiveConvoId(null);
                      }
                    }}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors" // Removed group class as it's not needed here
                    title="Delete all conversations"
                  >
                       <Trash2 className="h-3 w-3" />
                       <span>Delete All</span>
                 </button>
               )}
          </div>
             <ul className="space-y-1 pb-2"> 
          {convos.map(c => (
          <li
            key={c.id}
                 // --- Added relative ---
                 className={`relative px-3 py-2 rounded-md cursor-pointer transition-all duration-150 ease-in-out flex justify-between items-center group ${
              c.id === activeConvoId 
                     ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium shadow-sm'
                     : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <div 
                       className="flex items-center flex-1 min-w-0 mr-2" // Keep click handler for selecting convo
                  onClick={() => {
                      setActiveConvoId(c.id);
                         if (window.innerWidth < 1024) closeSidebar();
                  }}
                >
                      {/* Icon indicator */}
                      <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 transition-colors ${c.id === activeConvoId ? 'bg-indigo-500' : 'bg-gray-400 dark:bg-gray-600 group-hover:bg-indigo-400'}`}></div>
              <div className="truncate text-sm">{c.title}</div>
            </div>
            <button 
              onClick={(e) => {
                         e.stopPropagation(); // Prevent triggering li's onClick
                         // --- FIX: Added confirmation ---
                         if (confirm(`Delete chat "${c.title || 'Untitled'}"?`)) { 
                setConvos(prev => prev.filter(convo => convo.id !== c.id));
                    if (activeConvoId === c.id) {
                       const remainingConvos = convos.filter(convo => convo.id !== c.id);
                             // Select the next available convo or null if none left
                             const currentIndex = convos.findIndex(convo => convo.id === c.id);
                             const nextIndex = currentIndex > 0 ? currentIndex - 1 : 0; // Go to previous or first
                             setActiveConvoId(remainingConvos.length > 0 ? remainingConvos[nextIndex]?.id ?? remainingConvos[0]?.id : null);
                           }
                    }
                  }}
                       // --- Ensure visibility classes are correct ---
                       className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 ease-in-out hover:scale-110 focus:outline-none focus:ring-1 focus:ring-red-500 rounded-full"
              title="Delete conversation"
            >
                   <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
          </ul>
        </div>
        
           {/* --- UPDATED: Footer Credit --- */}
           <div className="flex-shrink-0 mt-auto border-t border-gray-200 dark:border-gray-700 p-4">
               <a 
                  href="https://shubharthaksangharsha.github.io/" // Your link
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 group/footer text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                >
                 {/* --- Add shimmer style to container, apply gradient to icon --- */}
                 <div 
                  className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center ring-1 ring-inset ring-gray-300 dark:ring-gray-600 flex-shrink-0 transition-colors group-hover/footer:ring-indigo-500 animate-shimmer relative overflow-hidden" // Added relative + overflow-hidden for shimmer mask
                  style={{ 
                      animationDuration: '3s',
                      '--shimmer-color': 'rgba(255,255,255,0.1)', // Lighter shimmer for dark bg
                      '--shimmer-color-dark': 'rgba(0,0,0,0.1)'   // Darker shimmer for light bg
                 }} // Removed 'as React.CSSProperties'
                 > 
                   <UserIcon 
                     className="h-4 w-4 transition-transform group-hover/footer:scale-110 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" // Gradient text colors
                   /> 
              </div>
                 {/* Text fades in/out */}
                 <div className={`flex flex-col transition-opacity duration-300 lg:opacity-0 ${sidebarLocked ? 'lg:opacity-100' : 'group-hover:lg:opacity-100'}`}>
                     <span className="text-xs whitespace-nowrap">Developed by</span>
                     <span className="text-sm font-medium whitespace-nowrap">Shubharthak</span>
          </div>
                </a>
        </div>
        </div> {/* End aside's flex container */}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden transition-all duration-500 ease-in-out bg-gray-100 dark:bg-gray-900"> {/* Ensure main bg color */}
        {/* Header - Remove hamburger, adjust model selector position */}
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10 py-2 px-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
             {/* --- NEW: Mobile Hamburger Button (in Header) --- */}
             <button
                onClick={() => setIsSidebarOpen(true)} // Only opens sidebar
                className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-500 dark:hover:text-indigo-400 lg:hidden" // Visible only below lg breakpoint
                aria-label="Open Menu"
             >
                <Menu className="h-5 w-5" />
             </button>
             {/* --- End Mobile Hamburger Button --- */}

            {/* Model Select - Remove label, center alignment might need adjustment */}
            <div className="flex items-center flex-shrink min-w-0 lg:ml-0 ml-2"> {/* Add ml-2 for spacing on mobile */}
                {/* Removed label */}
                <div className="relative flex-shrink min-w-0">
                <select
                  id="modelSelect"
                    // Added font-medium, adjusted padding slightly
                    className="text-sm font-medium rounded-md py-1.5 pl-3 pr-8 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/60 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 appearance-none truncate cursor-pointer transition-colors" 
                  value={currentModel}
                  onChange={e => setCurrentModel(e.target.value)}
                    title={models.find(m => m.id === currentModel)?.name || currentModel} 
                >
                  {models.map(m => (
                      <option key={m.id} value={m.id} title={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
                  {/* Custom Arrow Indicator */}
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
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
              <div className="">
                {/* <BellRing className="h-10 w-10 text-indigo-500 dark:text-indigo-400" /> */}
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
          isModelSpeaking={isModelSpeaking} // Pass speaking state
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
          key={msg.id || idx} // Use message ID if available, fallback to index
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
            {/* --- UPDATED: Part Rendering Logic --- */}
            {msg.parts.map((part, i) => {
              // Explicitly check for text part
              if (part.text) {
                // Render text with preserved whitespace
                return (
                  <div key={`${msg.id || idx}-text-${i}`} className="whitespace-pre-wrap">
                    {part.text}
                  </div>
                );
              } 
              // Explicitly check for image part
              else if (part.inlineData?.mimeType?.startsWith('image/')) {
                // Render image using inlineData
                return (
                  <div key={`${msg.id || idx}-img-${i}`} className="my-2"> {/* Added margin */}
                    <img 
                      src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
                      alt="Generated content" // More generic alt text
                      className="max-w-full h-auto rounded-md" // Ensure responsiveness
                    />
                  </div>
                );
              } 
              // Handle other potential part types here if needed in the future
              // else if (part.functionCall) { ... } 
              else {
                // Optionally log unexpected part structures
                // console.warn("Unhandled message part:", part);
                return null; // Render nothing for unknown parts
              }
            })}
             {/* --- End Updated Part Rendering Logic --- */}
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
    isRecording, onStartRecording, onStopRecording, isModelSpeaking // Receive isModelSpeaking
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
        {/* Header - Reverted Pulse, Restored Status */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0"> {/* Restored mb-4 */}
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
            Apsara Live
          </h2>
          {/* Show only Connection Status */}
          <div className="text-sm font-medium">{getStatusIndicator()}</div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
            <X className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
          </button>
        </div>
        
        {/* Message Display Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2 border rounded-md p-3 bg-gray-50 dark:bg-gray-900/50 custom-scrollbar relative"> {/* Added relative positioning */}
           {/* Display Placeholder if no messages and disconnected */}
           {messages.length === 0 && !isSessionActive && (
             <div className="text-center text-gray-500 dark:text-gray-400 p-4">
                 Configure settings below and click "Start Session".
             </div>
           )}
           {/* Map over messages passed as props */}
           {messages.map((msg) => (
             <div
               key={msg.id} // Use unique ID from message state
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
                     : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' // Error role
                 }`}
               >
                 {renderMessageContent(msg)}
               </div>
             </div>
           ))}
           <div ref={messagesEndRef} /> {/* Scroll target */}

           {/* Audio Pulse Area (Positioned at the bottom of the message area) */}
           {isModelSpeaking && (
             <div className="sticky bottom-0 left-0 right-0 flex justify-center items-center p-2 bg-gradient-to-t from-gray-50 dark:from-gray-900/50 via-gray-50/80 dark:via-gray-900/40 to-transparent pointer-events-none"> {/* Gradient fade */}
               <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow">
                 <div className="w-1.5 h-3 bg-blue-500 rounded-full animate-pulse-audio delay-75"></div>
                 <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-pulse-audio delay-150"></div>
                 <div className="w-1.5 h-3 bg-blue-500 rounded-full animate-pulse-audio delay-300"></div>
                 <span className="text-xs text-gray-600 dark:text-gray-400 ml-1.5">Speaking...</span>
               </div>
             </div>
           )}
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
                    onClick={() => {
                        if (isRecording) onStopRecording(); else onStartRecording();
                    }}
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