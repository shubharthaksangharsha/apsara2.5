import { useState, useRef } from 'react';

const BACKEND_URL = 'http://localhost:9000'; // Consider moving to config

export function useChatApi({
  convos, // Need convos to find the active one and get its messages
  setConvos, // Need to update convos with user/model/error messages
  activeConvoId,
  setActiveConvoId, // Need to set active ID for new chats started via API
  currentModel,
  temperature,
  maxOutputTokens,
  enableGoogleSearch,
  enableCodeExecution, // Add if used
  systemInstruction,
  isSystemInstructionApplicable,
  uploadedFiles, // <-- New prop: List of uploaded file metadata
  clearUploadedFiles, // <-- New prop: Function to clear uploaded files
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [streamingModelMessageId, setStreamingModelMessageId] = useState(null);

  // Helper to apply generation/tool config based on current settings
  const applyConfigSettings = (config = {}, isImageGenCall = false, overrideEnableSearch = null, overrideEnableCodeExec = null) => {
    config.generationConfig = config.generationConfig || {};
    config.generationConfig.temperature = temperature;
    config.generationConfig.maxOutputTokens = maxOutputTokens;

    // Determine effective tool state: prioritize overrides, then hook state
    const useSearch = overrideEnableSearch !== null ? overrideEnableSearch : enableGoogleSearch;
    const useCodeExec = overrideEnableCodeExec !== null ? overrideEnableCodeExec : enableCodeExecution;
    // console.log("applyConfigSettings - Effective Tools:", { useSearch, useCodeExec }); // Debug log

    if (!isImageGenCall && isSystemInstructionApplicable) {
      config.systemInstruction = systemInstruction;
    } else {
      delete config.systemInstruction;
    }

    // Initialize tools array
    config.tools = [];

    // Tool configuration - Enforce mutual exclusivity based on priority
    if (!isImageGenCall) {
      if (useSearch) {
        // Priority 1: Google Search - If enabled, this MUST be the only tool
        config.tools = [{ googleSearch: {} }];
      } else if (useCodeExec) {
        // Priority 2: Code Execution - If enabled (and search is off), this is the only tool
        config.tools = [{ codeExecution: {} }];
      } else {
        // Priority 3 (Future): Function Calling / Custom Tools
        // If neither search nor code execution is enabled, other tools *could* be added here.
        // Example (if you add function calling later):
        // if (enableFunctionCalling && functionDeclarations?.length > 0) {
        //    config.tools = [{ functionDeclarations: functionDeclarations }];
        // }
      }
    }

    if (config.tools.length === 0) delete config.tools;
    if (Object.keys(config.generationConfig).length === 0) delete config.generationConfig;

    return config;
  };


  const sendToBackend = async (text, targetConvoId = null, initialConvoData = null, targetModelId = null) => {
    const convoIdToUse = targetConvoId || activeConvoId;
    if (!convoIdToUse && !initialConvoData) {
      console.error("useChatApi: No active conversation and no initial data provided.");
      return;
    }

    setIsLoading(true);
    let finalConvoId = convoIdToUse;
    let userMessageParts = [{ text }]; // Start with the text part

    // Append file parts if any files are uploaded
    if (uploadedFiles && uploadedFiles.length > 0) {
      uploadedFiles.forEach(file => {
        if (file.uri && file.mimetype) {
          userMessageParts.push({
            fileData: {
              mimeType: file.mimetype,
              fileUri: file.uri,
            }
          });
          console.log(`[useChatApi] Adding file to message: ${file.originalname}, URI: ${file.uri}`);
        } else {
          console.warn(`[useChatApi] Skipping file due to missing URI or mimetype:`, file);
        }
      });
    }

    try {
      let turns;
      let currentMessages = [];

      // --- Handle initial convo creation or find existing ---
      if (initialConvoData) {
        finalConvoId = initialConvoData.id;
        turns = [{ role: 'user', parts: userMessageParts }]; // Use combined parts
        // Add new convo optimistically
        setConvos(prev => [
          { ...initialConvoData, messages: [{ role: 'user', parts: userMessageParts }] },
          ...prev.filter(c => c.id !== initialConvoData.id)
        ]);
        setActiveConvoId(finalConvoId); // Ensure App knows the active ID
        currentMessages = [{ role: 'user', parts: userMessageParts }]; // For title update logic later
      } else {
        const activeConvo = convos.find(c => c.id === convoIdToUse);
        if (!activeConvo) throw new Error('No active conversation found');
        currentMessages = activeConvo.messages || [];
        const validMessages = currentMessages.filter(msg => (msg.role === 'user' || msg.role === 'model') && msg.parts?.length > 0);
        turns = [...validMessages, { role: 'user', parts: userMessageParts }]; // Use combined parts
        // Update UI immediately with user message
        setConvos(prev => prev.map(c =>
          c.id !== convoIdToUse ? c : { ...c, messages: [...currentMessages, { role: 'user', parts: userMessageParts }] }
        ));
      }

      // --- API Call ---
      const modelToUse = targetModelId || currentModel;
      const isImageGen = modelToUse === 'gemini-2.0-flash-preview-image-generation';
      const baseRequestBody = {
        contents: turns,
        modelId: modelToUse,
        config: applyConfigSettings({}, isImageGen),
      };

      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseRequestBody),
      });

      // Clear uploaded files after the request is made (success or fail)
      if (uploadedFiles && uploadedFiles.length > 0) {
        console.log("[useChatApi] Clearing uploaded files after sendToBackend.");
        clearUploadedFiles();
      }

      const data = await response.json();
      if (!response.ok || data.error) {
         throw new Error(data.error?.message || data.error || `HTTP error! status: ${response.status}`);
      }

      // Process response parts - handle potential structured response
      const responseParts = [];
      if (typeof data.response === 'string') responseParts.push({ text: data.response });
      else if (Array.isArray(data.response)) {
        // If it's an array, assume it's already an array of parts (like image response)
        responseParts.push(...data.response);
      } else if (data.response?.parts && Array.isArray(data.response.parts)) {
        // If response is an object with a 'parts' array (like streaming chunks consolidated)
        responseParts.push(...data.response.parts);
      }
      else responseParts.push({ text: '(No response)' });

      const reply = {
        role: 'model',
        parts: responseParts,
        // Add code execution info to metadata if present at the top level of the backend response
        ...(data.executableCode && { executableCode: data.executableCode }),
        ...(data.codeExecutionResult && { codeExecutionResult: data.codeExecutionResult }),
        metadata: { finishReason: data.finishReason, usageMetadata: data.usageMetadata },
        id: Date.now() + Math.random(),
      };

      // Update conversation with AI reply
      setConvos(prev => prev.map(c => {
        if (c.id !== finalConvoId) return c;
        // Ensure we're updating based on the state *after* the user message was added
        const messagesAfterUser = c.messages || [];
        return { ...c, messages: [...messagesAfterUser, reply] };
      }));

      // Update title for new conversations (if it was initially 'New Chat')
      const finalConvoState = convos.find(c => c.id === finalConvoId); // Get potentially updated state
      if (finalConvoState && finalConvoState.title === 'New Chat' && finalConvoState.messages.length <= 2) { // User msg + AI reply
        const newTitle = text.length > 30 ? text.substring(0, 30) + '...' : text;
        setConvos(prev => prev.map(c => c.id === finalConvoId ? { ...c, title: newTitle } : c));
      }

    } catch (err) {
      console.error('Chat error:', err);
      // Add error message to the conversation
      setConvos(prev => prev.map(c => {
        if (c.id !== finalConvoId) return c;
        const currentMsgs = c.messages || [];
        return {
          ...c,
          messages: [...currentMsgs, { role: 'error', parts: [{ text: `Error: ${err.message}` }], id: Date.now() + Math.random() }],
        };
      }));
      // Also clear files on error if they haven't been cleared yet
      if (uploadedFiles && uploadedFiles.length > 0 && clearUploadedFiles) {
         console.log("[useChatApi] Clearing uploaded files after sendToBackend error.");
         clearUploadedFiles();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startStreamChat = async (text, targetConvoId = null, initialConvoData = null, targetModelId = null, overrideEnableSearch = null, overrideEnableCodeExec = null) => {
    const convoIdToUse = targetConvoId || activeConvoId;
     if (!convoIdToUse && !initialConvoData) {
       console.error("startStreamChat: No active conversation and no initial data provided.");
       return;
     }

    setIsLoading(true);
    let finalConvoId = convoIdToUse;
    let tempModelMessageId = null; // Temporary ID for the message being built
    let userMessageParts = [{ text }]; // Start with the text part

    // Append file parts if any files are uploaded
    if (uploadedFiles && uploadedFiles.length > 0) {
      uploadedFiles.forEach(file => {
        if (file.uri && file.mimetype) {
          userMessageParts.push({
            fileData: {
              mimeType: file.mimetype,
              fileUri: file.uri,
            }
          });
          console.log(`[useChatApi Stream] Adding file to message: ${file.originalname}, URI: ${file.uri}`);
        } else {
          console.warn(`[useChatApi Stream] Skipping file due to missing URI or mimetype:`, file);
        }
      });
    }

    try {
       let activeConvo;
       let turns;

      // --- Handle initial convo creation from prompt ---
       if (initialConvoData) {
         finalConvoId = initialConvoData.id;
         activeConvo = initialConvoData;
         turns = [{ role: 'user', parts: userMessageParts }]; // Use combined parts

         tempModelMessageId = Date.now() + Math.random() + '_model'; // Unique ID
         setStreamingModelMessageId(tempModelMessageId); // Track the ID

         // Add new convo, user message, and placeholder model message
         setConvos(prev => [
             { ...initialConvoData, messages: [
                 { role: 'user', parts: userMessageParts, id: Date.now() + Math.random() + '_user' }, // Use combined parts
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
         turns = [...validMessages, { role: 'user', parts: userMessageParts }]; // Use combined parts

         tempModelMessageId = Date.now() + Math.random() + '_model';
         setStreamingModelMessageId(tempModelMessageId);

         // Add user message and placeholder model message
      setConvos(prev => prev.map(c => {
           if (c.id !== convoIdToUse) return c;
        return {
          ...c,
             messages: [
               ...(c.messages || []),
               { role: 'user', parts: userMessageParts, id: Date.now() + Math.random() + '_user' }, // Use combined parts
               { role: 'model', parts: [], id: tempModelMessageId } // Placeholder
             ]
        };
      }));
       }

       // --- API Call ---
       const modelToUse = targetModelId || currentModel;
       const isImageGen = modelToUse === 'gemini-2.0-flash-preview-image-generation';
      const baseRequestBody = {
        contents: turns,
         modelId: modelToUse,
         config: applyConfigSettings({}, isImageGen, overrideEnableSearch, overrideEnableCodeExec),
      };

      const response = await fetch(`${BACKEND_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseRequestBody)
      });

      // Clear uploaded files after the request is made (success or fail)
      if (uploadedFiles && uploadedFiles.length > 0) {
        console.log("[useChatApi Stream] Clearing uploaded files after startStreamChat.");
        clearUploadedFiles();
      }

      if (!response.ok || !response.body) {
          const errorData = await response.json().catch(() => ({ error: { message: `HTTP error! status: ${response.status}` } }));
          throw new Error(errorData.error?.message || `Stream failed! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = '';
      let finalMetadata = {}; // Keep track of final metadata separately

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        let lines = lineBuffer.split('\n\n');
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.startsWith('data: ')) {
            const jsonData = line.slice(6);
            try {
              const data = JSON.parse(jsonData);

              // --- Handle Different Part Types ---
              if (data.text || data.inlineData || data.executableCode || data.codeExecutionResult) {
                   setConvos(prevConvos => prevConvos.map(c => {
                      if (c.id !== finalConvoId) return c;
                      const updatedMessages = c.messages.map(m => {
                          if (m.id === tempModelMessageId) {
                              let currentParts = m.parts ? [...m.parts] : [];

                              // Handle text - append or add new
                              if (data.text) {
                                  const lastPartIndex = currentParts.length - 1;
                                  if (lastPartIndex >= 0 && typeof currentParts[lastPartIndex] === 'object' && 'text' in currentParts[lastPartIndex]) {
                                      currentParts[lastPartIndex] = { ...currentParts[lastPartIndex], text: currentParts[lastPartIndex].text + data.text };
                                  } else {
                                      currentParts.push({ text: data.text });
                                  }
                              }
                              // Handle images (inlineData) - add new
                              else if (data.inlineData) {
                                  currentParts.push({ inlineData: data.inlineData });
                              }
                              // Handle executable code - add new
                              else if (data.executableCode) {
                                  currentParts.push({ executableCode: data.executableCode });
                              }
                              // Handle code result - add new
                              else if (data.codeExecutionResult) {
                                  currentParts.push({ codeExecutionResult: data.codeExecutionResult });
                              }
                              return { ...m, parts: currentParts };
                          }
                          return m;
                      });
                      return { ...c, messages: updatedMessages };
                   }));
              }

              // --- Store Metadata Separately ---
              // We don't update the message metadata until the stream finishes
              if (data.finishReason) {
                 finalMetadata.finishReason = data.finishReason;
              }
              if (data.usageMetadata) {
                 finalMetadata.usageMetadata = data.usageMetadata;
              }

            } catch (e) {
              console.error('Error parsing stream data chunk:', e, "Problematic JSON:", jsonData);
            }
          } else if (line.startsWith('event: error')) {
               const errorPayload = line.slice(line.indexOf(':') + 1);
               const errorData = JSON.parse(errorPayload);
               throw new Error(errorData.error || 'Unknown stream error event');
          }
          // Note: The original logic didn't explicitly handle event: done,
          // it relied on the reader finishing (done = true).
          // We also don't need the 'finishReason' block inside the loop anymore.
        } // end for...of lines
      } // end while(true)

      // --- Finalize Message After Stream ---
      setConvos(prevConvos => prevConvos.map(c => {
         if (c.id !== finalConvoId) return c;
          let finalTitle = c.title;
          // Set title if it was a new chat
          const userPrompt = turns.find(turn => turn.role === 'user');
          const userPromptText = userPrompt?.parts?.[0]?.text;
          if (c.title === 'New Chat' && userPromptText) {
              finalTitle = userPromptText.length > 30 ? userPromptText.substring(0, 30) + '...' : userPromptText;
          }
          return {
             ...c,
             title: finalTitle,
             messages: c.messages.map(m => {
               if (m.id === tempModelMessageId) {
                 // Ensure message isn't empty, add metadata
                 const finalParts = (m.parts && m.parts.length > 0) ? m.parts : [{ text: '(Empty Response)' }];
                 // Ensure first part has text if parts exist but none do (edge case)
                  if (finalParts.length > 0 && finalParts.every(p => !p.text)) {
                     finalParts.unshift({ text: '(No text response)' });
                  }
                 return {
                   ...m,
                   parts: finalParts,
                   metadata: finalMetadata // Add collected metadata
                 };
               }
               return m;
             })
          };
       }));

     } catch (err) {
       console.error('Stream chat error:', err);
       setConvos(prevConvos => prevConvos.map(c => {
         if (c.id !== finalConvoId) return c;
         let messageUpdated = false;
         const messagesWithError = c.messages.map(m => {
           if (m.id === tempModelMessageId) {
             messageUpdated = true;
             return { role: 'error', parts: [{ text: `Stream Error: ${err.message}` }], id: tempModelMessageId + '_error' };
           }
           return m;
         });
         if (!messageUpdated) { messagesWithError.push({ role: 'error', parts: [{ text: `Stream Error: ${err.message}` }], id: Date.now() + Math.random() + '_error' }); }
         return { ...c, messages: messagesWithError };
       }));
        // Also clear files on error if they haven't been cleared yet
        if (uploadedFiles && uploadedFiles.length > 0 && clearUploadedFiles) {
            console.log("[useChatApi Stream] Clearing uploaded files after startStreamChat error.");
            clearUploadedFiles();
        }
     } finally {
       setIsLoading(false);
       setStreamingModelMessageId(null); // Clear tracking ID
     }
  };

  return {
    isLoading,
    streamingModelMessageId,
    sendToBackend,
    startStreamChat,
    applyConfigSettings, // Expose if needed externally, though maybe not
  };
}
