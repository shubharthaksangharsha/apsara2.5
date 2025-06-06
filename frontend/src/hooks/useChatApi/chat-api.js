/**
 * Regular (non-streaming) chat API methods
 */

import { BACKEND_URL } from './constants';
import { applyConfigSettings } from './config-utils';

/**
 * Sends a message to the backend using the regular chat endpoint
 * 
 * @param {string} text - User's message text
 * @param {string|null} targetConvoId - Target conversation ID
 * @param {object|null} initialConvoData - Initial conversation data for new chats
 * @param {string|null} targetModelId - Model ID to override the current model
 * @param {Function} setIsLoading - State setter for loading indicator
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
 * @returns {Promise<void>}
 */
export const sendToBackend = async (
  text, 
  targetConvoId = null, 
  initialConvoData = null, 
  targetModelId = null,
  setIsLoading,
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
  thinkingBudget
) => {
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
      // Pass null for overrides if they are not applicable or defined for non-streaming
      config: applyConfigSettings(
        {}, 
        isImageGen, 
        null, 
        null, 
        temperature,
        maxOutputTokens,
        enableGoogleSearch,
        enableCodeExecution,
        systemInstruction,
        isSystemInstructionApplicable,
        enableThinking,
        thinkingBudget
      ), 
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