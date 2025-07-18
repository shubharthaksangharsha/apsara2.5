import { useState } from 'react';
import { sendToBackend } from './chat-api';
import { startStreamChat } from './stream-api';
import { applyConfigSettings } from './config-utils';
import { BACKEND_URL } from './constants';

/**
 * Hook for interacting with the chat API
 * 
 * @param {Object} params - Hook parameters
 * @returns {Object} - Hook methods and state
 */
export function useChatApi({
  convos,
  setConvos,
  activeConvoId,
  setActiveConvoId,
  currentModel,
  temperature,
  maxOutputTokens,
  enableGoogleSearch,
  enableCodeExecution,
  systemInstruction,
  isSystemInstructionApplicable,
  uploadedFiles,
  clearUploadedFiles,
  enableThinking,
  thinkingBudget,
  enableFunctionCalling,
  selectedTools,
  functionCallingMode,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [streamingModelMessageId, setStreamingModelMessageId] = useState(null);

  /**
   * Wrapper for the regular chat API
   */
  const handleSendToBackend = async (text, targetConvoId = null, initialConvoData = null, targetModelId = null) => {
    return sendToBackend(
      text, 
      targetConvoId, 
      initialConvoData, 
      targetModelId,
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
      thinkingBudget,
      enableFunctionCalling,
      selectedTools,
      functionCallingMode,
      activeConvoId
    );
  };

  /**
   * Wrapper for the streaming chat API
   */
  const handleStartStreamChat = async (
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
    modelMessageIdToReplace = null
  ) => {
    return startStreamChat(
      text, 
      targetConvoId, 
      initialConvoData, 
      targetModelId, 
      overrideEnableSearch, 
      overrideEnableCodeExec, 
      explicitFiles,
      overrideEnableFunctionCalling,
      overrideSelectedTools,
      abortSignal,
      modelMessageIdToReplace,
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
    );
  };

  /**
   * Wrapper for config settings application
   */
  const handleApplyConfigSettings = (
    config = {}, 
    isImageGenCall = false, 
    overrideEnableSearch = null, 
    overrideEnableCodeExec = null
  ) => {
    return applyConfigSettings(
      config,
      isImageGenCall,
      overrideEnableSearch,
      overrideEnableCodeExec,
      temperature,
      maxOutputTokens,
      enableGoogleSearch,
      enableCodeExecution,
      systemInstruction,
      isSystemInstructionApplicable,
      enableThinking,
      thinkingBudget
    );
  };

  return {
    isLoading,
    streamingModelMessageId,
    sendToBackend: handleSendToBackend,
    startStreamChat: handleStartStreamChat,
    applyConfigSettings: handleApplyConfigSettings,
  };
} 