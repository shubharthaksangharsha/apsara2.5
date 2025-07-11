/**
 * Streaming chat API methods
 */

import { BACKEND_URL } from './constants';
import { applyConfigSettings } from './config-utils';

/**
 * Cleans conversation parts for API consumption by removing UI display fields
 * that would conflict with the Google API's oneof constraints
 */
const cleanPartsForApi = (parts) => {
  return parts.map(part => {
    const cleanPart = { ...part };
    
    // If this part has functionCall or functionResult, remove any text field
    // to avoid oneof violations
    if (cleanPart.functionCall || cleanPart.functionResult) {
      delete cleanPart.text;
    }
    
    return cleanPart;
  });
};

/**
 * Cleans conversation messages for API consumption
 */
const cleanMessagesForApi = (messages) => {
  return messages.map(msg => ({
    ...msg,
    parts: cleanPartsForApi(msg.parts || [])
  }));
};

/**
 * Sends a message to the backend using the streaming chat endpoint
 * 
 * @param {string} text - User's message text
 * @param {string|null} targetConvoId - Target conversation ID
 * @param {object|null} initialConvoData - Initial conversation data for new chats
 * @param {string|null} targetModelId - Model ID to override the current model
 * @param {boolean|null} overrideEnableSearch - Override for search tool enablement
 * @param {boolean|null} overrideEnableCodeExec - Override for code execution tool enablement
 * @param {Array|null} explicitFiles - Explicit files to use instead of uploadedFiles
 * @param {boolean|null} overrideEnableFunctionCalling - Override for function calling enablement
 * @param {Array|null} overrideSelectedTools - Override for selected tools
 * @param {AbortSignal|null} abortSignal - Signal to abort the fetch request
 * @param {string|null} modelMessageIdToReplace - ID of model message to replace (for regeneration)
 * @param {Function} setIsLoading - State setter for loading indicator
 * @param {Function} setStreamingModelMessageId - State setter for streaming message ID
 * @param {string|null} activeConvoId - Active conversation ID
 * @param {Array} convos - Current conversations array
 * @param {Function} setConvos - State setter for conversations
 * @param {Function} setActiveConvoId - State setter for active conversation ID
 * @param {Array} uploadedFiles - Files attached to the message
 * @param {Function} clearUploadedFiles - Function to clear uploaded files
 * @param {string} currentModel - Current model ID
 * @param {number} temperature - Model temperature setting
 * @param {number} maxOutputTokens - Maximum output tokens
 * @param {boolean} enableGoogleSearch - Whether Google Search is enabled
 * @param {boolean} enableCodeExecution - Whether Code Execution is enabled
 * @param {string} systemInstruction - System instruction text
 * @param {boolean} isSystemInstructionApplicable - Whether system instruction is applicable
 * @param {boolean} enableThinking - Whether thinking is enabled
 * @param {number} thinkingBudget - Thinking budget (tokens)
 * @param {boolean} enableFunctionCalling - Whether function calling is enabled
 * @param {Array} selectedTools - Array of selected tool names
 * @param {string} functionCallingMode - Function calling mode (AUTO, ANY, NONE)
 * @returns {Promise<void>}
 */
export const startStreamChat = async (
  text, 
  targetConvoId = null, 
  initialConvoData = null, 
  targetModelId = null, 
  overrideEnableSearch = null, 
  overrideEnableCodeExec = null, 
  explicitFiles = null,
  overrideEnableFunctionCalling = null,
  overrideSelectedTools = null,
  abortSignal = null,
  modelMessageIdToReplace = null,
  setIsLoading,
  setStreamingModelMessageId,
  activeConvoId,
  convos,
  setConvos,
  setActiveConvoId,
  uploadedFiles,
  clearUploadedFiles,
  currentModel,
  temperature,
  maxOutputTokens,
  enableGoogleSearch,
  enableCodeExecution,
  systemInstruction,
  isSystemInstructionApplicable,
  enableThinking,
  thinkingBudget,
  enableFunctionCalling,
  selectedTools,
  functionCallingMode
) => {
  const convoIdToUse = targetConvoId || activeConvoId;
  if (!convoIdToUse && !initialConvoData) {
    console.error("useChatApi: No active stream conversation and no initial data provided.");
    return;
  }

  setIsLoading(true);
  let finalConvoId = convoIdToUse;
  let tempModelMessageId = modelMessageIdToReplace || (Date.now() + Math.random() + '_model'); // Use provided ID or generate new one
  let userMessageParts = [{ text }]; // Start with the text part

  // Determine which files to use - either explicit files passed in or default hook-managed files
  const filesToUse = explicitFiles || uploadedFiles;
  
  // Append file parts if any files are available
  if (filesToUse && filesToUse.length > 0) {
    console.log('[useChatApi Stream] Using files:', {
      source: explicitFiles ? 'explicitFiles parameter' : 'uploadedFiles from hook',
      count: filesToUse.length
    });
    
    filesToUse.forEach(file => {
      if (file.uri && file.mimetype) {
        userMessageParts.push({
          fileData: {
            mimeType: file.mimetype,
            fileUri: file.uri,
            fileName: file.originalname,
            fileSize: file.size,
            tokenCount: file.tokenCount || 0 // Preserve token count
          }
        });
        console.log(`[useChatApi Stream] Adding file to message: ${file.originalname}, URI: ${file.uri}, tokens: ${file.tokenCount || 0}`);
      } else {
        console.warn(`[useChatApi Stream] Skipping file due to missing URI or mimetype:`, file);
      }
    });
  }

  try {
     let activeConvo;
     let turns;     // --- Handle initial convo creation from prompt ---
     if (initialConvoData) {
       finalConvoId = initialConvoData.id;
       activeConvo = initialConvoData;
       // Clean any existing messages before adding to turns
       const existingMessages = initialConvoData.messages || [];
       const cleanedExistingMessages = cleanMessagesForApi(existingMessages);
       turns = [...cleanedExistingMessages, { role: 'user', parts: userMessageParts }]; // Use combined parts

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
       
       // For regeneration, remove the model message being replaced and all messages after it
       let messagesToUse = validMessages;
       if (modelMessageIdToReplace) {
         const replaceIndex = validMessages.findIndex(msg => msg.id === modelMessageIdToReplace);
         if (replaceIndex >= 0) {
           messagesToUse = validMessages.slice(0, replaceIndex);
           console.log(`[useChatApi Stream] Regenerating response, using ${messagesToUse.length} messages before the replaced message`);
         }
       }
       
       const cleanedMessages = cleanMessagesForApi(messagesToUse);
       turns = [...cleanedMessages, { role: 'user', parts: userMessageParts }]; // Use combined parts

       setStreamingModelMessageId(tempModelMessageId);

       if (modelMessageIdToReplace) {
         // For regeneration, update the existing model message
         setConvos(prev => prev.map(c => {
           if (c.id !== convoIdToUse) return c;
           
           // Find the message to replace
           const messageIndex = c.messages.findIndex(m => m.id === modelMessageIdToReplace);
           if (messageIndex < 0) return c;
           
           // Create a new messages array with the updated model message
           const updatedMessages = [...c.messages];
           updatedMessages[messageIndex] = {
             ...updatedMessages[messageIndex],
             parts: [], // Clear existing parts
             regenerating: false, // Clear regenerating flag
             id: tempModelMessageId // Update ID to new one
           };
           
           // Remove any messages after the regenerated one
           const finalMessages = updatedMessages.slice(0, messageIndex + 1);
           
           return {
             ...c,
             messages: finalMessages
           };
         }));
       } else {
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
     }

     // --- API Call ---
     const modelToUse = targetModelId || currentModel;
     const isImageGen = modelToUse === 'gemini-2.0-flash-preview-image-generation';
     console.log('[startStreamChat] Creating config with tooling params:', {
       enableGoogleSearch, enableCodeExecution,
       overrideEnableSearch, overrideEnableCodeExec
     });
     
     const config = applyConfigSettings(
       {}, 
       isImageGen, 
       overrideEnableSearch, 
       overrideEnableCodeExec,
       temperature,
       maxOutputTokens,
       enableGoogleSearch,
       enableCodeExecution,
       systemInstruction,
       isSystemInstructionApplicable,
       enableThinking,
       thinkingBudget,
       overrideEnableFunctionCalling !== null ? overrideEnableFunctionCalling : enableFunctionCalling,
       overrideSelectedTools !== null ? overrideSelectedTools : selectedTools,
       functionCallingMode
     );
     
     console.log('[startStreamChat] Config after applyConfigSettings:', {
       hasTools: !!config.tools,
       toolsLength: config.tools ? config.tools.length : 0,
       toolsContent: config.tools ? JSON.stringify(config.tools) : 'none',
       disableDefaultTools: config.disableDefaultTools,
       enableGoogleSearch: config.enableGoogleSearch
     });
     
     const baseRequestBody = {
       contents: turns,
       modelId: modelToUse,
       config: config
     };
     
     console.log('[startStreamChat] Final request body tools:', baseRequestBody.config.tools);

    // --- API Call for Streaming ---
    const response = await fetch(`${BACKEND_URL}/chat/stream`, { // <-- CORRECTED URL
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseRequestBody),
      signal: abortSignal, // Add the abort signal
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

    // Process the stream response
    try {
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
              console.log('[useChatApi Stream] Received data chunk:', data); // <-- ADD THIS LINE

              // --- Handle Different Part Types ---
              if (data.text || data.inlineData || data.executableCode || data.codeExecutionResult || data.thought) { // Added data.thought here
                   setConvos(prevConvos => prevConvos.map(c => {
                      if (c.id !== finalConvoId) return c;
                      const updatedMessages = c.messages.map(m => {
                          if (m.id === tempModelMessageId) {
                              let currentParts = m.parts ? [...m.parts] : [];
                              let newPart = {}; // Create a new part object

                              // Handle text - append or add new
                              if (data.text) {
                                  const lastPartIndex = currentParts.length - 1;
                                  if (lastPartIndex >= 0 && 
                                      typeof currentParts[lastPartIndex] === 'object' && 
                                      'text' in currentParts[lastPartIndex] &&
                                      // Ensure thought status matches for appending
                                      (currentParts[lastPartIndex].thought === true) === (data.thought === true)) { 
                                      currentParts[lastPartIndex] = { 
                                          ...currentParts[lastPartIndex], 
                                          text: currentParts[lastPartIndex].text + data.text 
                                          // 'thought' status is preserved from currentParts[lastPartIndex]
                                      };
                                      newPart = null; // Indicate no new part needs to be pushed
                                  } else {
                                      newPart.text = data.text;
                                  }
                              }
                              // Handle images (inlineData) - add new
                              if (data.inlineData) { 
                                  if (newPart === null) newPart = {}; // Reinitialize if it was nulled by text append
                                  newPart.inlineData = data.inlineData;
                              }
                              // Handle executable code - add new
                              if (data.executableCode) { 
                                  if (newPart === null) newPart = {}; // Reinitialize
                                  newPart.executableCode = data.executableCode;
                              }
                              // Handle code result - add new
                              if (data.codeExecutionResult) { 
                                  if (newPart === null) newPart = {}; // Reinitialize
                                  newPart.codeExecutionResult = data.codeExecutionResult;
                              }
                              
                              // Preserve the thought property ONLY if newPart is being created
                              // AND it's not an executableCode or codeExecutionResult part.
                              if (newPart && data.thought && !newPart.executableCode && !newPart.codeExecutionResult) {
                                  newPart.thought = true; 
                              }

                              if (newPart && Object.keys(newPart).length > 0) {
                                  currentParts.push(newPart);
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
          } else if (line.startsWith('event: grounding')) {
               try {
                   const groundingPayload = line.slice(line.indexOf('data:') + 5).trim();
                   const groundingData = JSON.parse(groundingPayload);
                   console.log('📚 Grounding metadata event received:', groundingData);
                   
                   // Store grounding metadata directly on the model message
                   setConvos(prevConvos => prevConvos.map(c => {
                       if (c.id !== finalConvoId) return c;
                       const updatedMessages = c.messages.map(m => {
                           if (m.id === tempModelMessageId) {
                               return {
                                   ...m,
                                   groundingMetadata: groundingData  // Store directly on the message
                               };
                           }
                           return m;
                       });
                       return { ...c, messages: updatedMessages };
                   }));
                   
                   // Also store in finalMetadata for end-of-stream processing
                   finalMetadata.groundingMetadata = groundingData;
               } catch (e) {
                   console.error('Error parsing grounding event:', e);
               }
          } else if (line.startsWith('event: function_call')) {
               try {
                   const functionCallPayload = line.slice(line.indexOf('data:') + 5).trim();
                   const functionCallData = JSON.parse(functionCallPayload);
                   console.log('Function call event:', functionCallData);
                   // Handle function call display in the UI
                   if (functionCallData.functionCall) {
                       const isImageFunction = functionCallData.functionCall.name === 'generateImage' || 
                                             functionCallData.functionCall.name === 'editImage';
                       
                       console.log('🔧 Function call detected:', functionCallData.functionCall.name, 'isImageFunction:', isImageFunction);
                       
                       setConvos(prevConvos => prevConvos.map(c => {
                           if (c.id !== finalConvoId) return c;
                           const updatedMessages = c.messages.map(m => {
                               if (m.id === tempModelMessageId) {
                                   const currentParts = [...(m.parts || [])];
                                   
                                   if (isImageFunction) {
                                       // Add image loading spinner for image generation functions
                                       console.log('🖼️ Adding image loading spinner');
                                       currentParts.push({
                                           imageLoading: true,
                                           functionName: functionCallData.functionCall.name,
                                           loadingId: `${tempModelMessageId}-${functionCallData.functionCall.name}-loading`
                                       });
                                   } else {
                                       // Add function call display part
                                       currentParts.push({
                                           functionCall: {
                                               name: functionCallData.functionCall.name,
                                               args: functionCallData.functionCall.args || {}
                                           }
                                       });
                                   }
                                   return { ...m, parts: currentParts };
                               }
                               return m;
                           });
                           return { ...c, messages: updatedMessages };
                       }));
                   }
               } catch (e) {
                   console.error('Error parsing function call event:', e);
               }
          } else if (line.startsWith('event: function_result')) {
               try {
                   const functionResultPayload = line.slice(line.indexOf('data:') + 5).trim();
                   const functionResultData = JSON.parse(functionResultPayload);
                   console.log('Function result event:', functionResultData);
                   // Handle function result display in the UI
                   if (functionResultData.functionCall && functionResultData.result) {
                       const isImageFunction = functionResultData.functionCall.name === 'generateImage' || 
                                             functionResultData.functionCall.name === 'editImage';
                       
                       // Special handling for URL context tool
                       const isUrlContext = functionResultData.functionCall.name === 'urlContext';
                       
                       // Special handling for Google Search tool
                       const isGoogleSearch = functionResultData.functionCall.name === 'googleSearch';
                       
                       setConvos(prevConvos => prevConvos.map(c => {
                           if (c.id !== finalConvoId) return c;
                           
                           // First, update the model message
                           const updatedMessages = c.messages.map(m => {
                               if (m.id === tempModelMessageId) {
                                   const currentParts = [...(m.parts || [])];
                                   
                                   if (isImageFunction) {
                                       // Update loading spinner to show processing for image functions
                                       const loadingPartIndex = currentParts.findIndex(p => 
                                           p.imageLoading && p.functionName === functionResultData.functionCall.name
                                       );
                                       if (loadingPartIndex !== -1) {
                                           currentParts[loadingPartIndex] = {
                                               ...currentParts[loadingPartIndex],
                                               loadingText: 'Processing image...'
                                           };
                                       }
                                   } else {
                                       // Find and replace function call part with function result
                                       const functionCallIndex = currentParts.findIndex(p => 
                                           p.functionCall && p.functionCall.name === functionResultData.functionCall.name
                                       );
                                       
                                       if (functionCallIndex !== -1) {
                                           // Replace function call with function result
                                           currentParts[functionCallIndex] = {
                                               functionResult: {
                                                   name: functionResultData.functionCall.name,
                                                   result: functionResultData.result
                                               }
                                           };
                                       } else {
                                           // If no function call part found, add a new function result part
                                           currentParts.push({
                                               functionResult: {
                                                   name: functionResultData.functionCall.name,
                                                   result: functionResultData.result
                                               }
                                           });
                                       }
                                   }
                                   
                                   // Handle URL Context metadata
                                   if (isUrlContext && functionResultData.result?.url_context_metadata?.url_metadata) {
                                       console.log('📄 URL context metadata detected:', 
                                           functionResultData.result.url_context_metadata);
                                       
                                       return { 
                                           ...m, 
                                           parts: currentParts,
                                           url_context_metadata: functionResultData.result.url_context_metadata
                                       };
                                   }
                                   
                                   // Handle Google Search metadata (should be handled by grounding event, but this is a backup)
                                   if (isGoogleSearch && functionResultData.result?.groundingMetadata) {
                                       console.log('🔍 Google Search metadata detected in function result:', 
                                           functionResultData.result.groundingMetadata);
                                       
                                       return { 
                                           ...m, 
                                           parts: currentParts,
                                           groundingMetadata: functionResultData.result.groundingMetadata 
                                       };
                                   }
                                   
                                   return { ...m, parts: currentParts };
                               }
                               return m;
                           });
                           
                           // Then, update the user message with function response
                           const userMessageIndex = c.messages.findIndex(m => 
                               m.role === 'user' && 
                               !m.functionResponse &&
                               m.parts && m.parts.some(p => p.text && p.text.includes(text.substring(0, 20)))
                           );
                           
                           if (userMessageIndex !== -1) {
                               updatedMessages[userMessageIndex] = {
                                   ...updatedMessages[userMessageIndex],
                                   functionResponse: {
                                       name: functionResultData.functionCall.name,
                                       response: { result: functionResultData.result }
                                   }
                               };
                           }
                           
                           return { ...c, messages: updatedMessages };
                       }));
                   }
               } catch (e) {
                   console.error('Error parsing function result event:', e);
               }
          } else if (line.startsWith('event: image_result')) {
               try {
                   const imageResultPayload = line.slice(line.indexOf('data:') + 5).trim();
                   const imageResultData = JSON.parse(imageResultPayload);
                   console.log('🖼️ Image result event received:', imageResultData);
                   
                   // Handle image result - replace loading spinner with actual image
                   if (imageResultData.inlineData) {
                       setConvos(prevConvos => prevConvos.map(c => {
                           if (c.id !== finalConvoId) return c;
                           const updatedMessages = c.messages.map(m => {
                               if (m.id === tempModelMessageId) {
                                   const currentParts = [...(m.parts || [])];
                                   
                                   // Find and replace the loading spinner with the actual image
                                   const loadingPartIndex = currentParts.findIndex(p => 
                                       p.imageLoading && (p.functionName === 'generateImage' || p.functionName === 'editImage')
                                   );
                                   
                                   console.log('🖼️ Looking for loading spinner, found at index:', loadingPartIndex);
                                   console.log('🖼️ Current parts:', currentParts.map(p => ({ 
                                       hasText: !!p.text, 
                                       hasImage: !!p.inlineData, 
                                       isLoading: !!p.imageLoading,
                                       functionName: p.functionName 
                                   })));
                                   
                                   if (loadingPartIndex !== -1) {
                                       // Replace loading spinner with image
                                       console.log('🖼️ Replacing loading spinner with image');
                                       currentParts[loadingPartIndex] = {
                                           inlineData: imageResultData.inlineData
                                       };
                                   } else {
                                       // Fallback: add image as new part if no loading spinner found
                                       console.log('🖼️ Loading spinner not found, adding image as new part');
                                       currentParts.push({
                                           inlineData: imageResultData.inlineData
                                       });
                                   }
                                   
                                   return { ...m, parts: currentParts };
                               }
                               return m;
                           });
                           return { ...c, messages: updatedMessages };
                       }));
                   }
               } catch (e) {
                   console.error('Error parsing image result event:', e);
               }
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
    if (err.name === 'AbortError') {
      console.log('[useChatApi] Stream request was aborted');
      
      // When aborting, we need to clear any pending state like image loading spinners
      setConvos(prevConvos => prevConvos.map(c => {
        if (c.id !== finalConvoId) return c;
        const updatedMessages = c.messages.map(m => {
          if (m.id === tempModelMessageId) {
            // Remove loading spinners and add abort message
            const finalParts = m.parts?.filter(p => !p.imageLoading) || [];
            // Add an abort message if there's content already
            if (finalParts.length > 0) {
              finalParts.push({ text: "\n\n[Request stopped by user]" });
            } else {
              finalParts.push({ text: "[Request stopped by user]" });
            }
            return {
              ...m,
              parts: finalParts
            };
          }
          return m;
        });
        return { ...c, messages: updatedMessages };
      }));
      
      // Re-throw the abort error to be handled by the caller
      throw err;
    } else {
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
    }
  } finally {
    setIsLoading(false);
    setStreamingModelMessageId(null); // Clear tracking ID
  }
} catch (outerErr) {
  // Handle any errors from the outer try block
  console.error('[useChatApi] Outer error:', outerErr);
  setIsLoading(false);
  setStreamingModelMessageId(null);
  throw outerErr;
}
};

/**
 * Helper function to update convos with model message parts
 */
const updateConvosWithModelMessage = (convos, convoId, msgId, parts, additionalMetadata = {}) => {
  return convos.map(convo => {
    if (convo.id !== convoId) return convo;
    
    const msgIndex = convo.messages.findIndex(msg => msg.id === msgId);
    if (msgIndex === -1) return convo;
    
    // Clone messages array
    const updatedMessages = [...convo.messages];
    
    // Create updated model message with parts and any additional metadata
    updatedMessages[msgIndex] = {
      ...updatedMessages[msgIndex],
      parts: [...parts],
      ...additionalMetadata // Add any additional metadata (groundingMetadata, url_context_metadata)
    };
    
    // Return updated convo
    return {
      ...convo,
      messages: updatedMessages
    };
  });
};