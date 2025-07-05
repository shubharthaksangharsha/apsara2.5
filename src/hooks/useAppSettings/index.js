import { useState, useEffect, useCallback } from 'react';
import { LS_KEYS, DEFAULT_TEMPERATURE, DEFAULT_MAX_OUTPUT_TOKENS, 
         DEFAULT_THINKING_ENABLED, DEFAULT_THINKING_BUDGET } from './constants';
import { loadFromStorage, saveToStorage, removeFromStorage } from './settings-persistence';
import { updateSettingsBasedOnCapabilities } from './capabilities-utils';
import { getModelCapabilities } from '../../utils/modelCapabilities';

/**
 * Hook for managing application settings and model capabilities
 * 
 * @param {string} initialSystemInstruction - Initial system instruction from backend
 * @returns {Object} Settings state and functions
 */
export function useAppSettings(initialSystemInstruction) {
  // --- State Initialization ---
  const [currentModel, setCurrentModel] = useState(() => 
    loadFromStorage(LS_KEYS.CURRENT_MODEL, ''));
    
  const [currentVoice, setCurrentVoice] = useState(() => 
    loadFromStorage(LS_KEYS.CURRENT_VOICE, ''));
    
  const [systemInstruction, setSystemInstruction] = useState(''); // Initialize empty, set later
  
  const [temperature, setTemperature] = useState(() => 
    loadFromStorage(LS_KEYS.TEMPERATURE, DEFAULT_TEMPERATURE, parseFloat));
    
  const [maxOutputTokens, setMaxOutputTokens] = useState(() => 
    loadFromStorage(LS_KEYS.MAX_OUTPUT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS, val => parseInt(val, 10)));
    
  // Initialize tool selection flags to false by default (no localStorage dependency)
  const [enableGoogleSearch, setEnableGoogleSearch] = useState(false);
  const [enableCodeExecution, setEnableCodeExecution] = useState(false);
  
  const [enableThinking, setEnableThinking] = useState(() => 
    loadFromStorage(LS_KEYS.ENABLE_THINKING, DEFAULT_THINKING_ENABLED, val => val === 'true'));
    
  const [thinkingBudget, setThinkingBudget] = useState(() => 
    loadFromStorage(LS_KEYS.THINKING_BUDGET, DEFAULT_THINKING_BUDGET, val => parseInt(val, 10)));

  // Store model capabilities
  const [modelCapabilities, setModelCapabilities] = useState(getModelCapabilities(currentModel));

  // --- Effects to Update State and Capabilities ---

  // Set initial system instruction once fetched
  useEffect(() => {
    if (initialSystemInstruction !== null) { // Check if it's fetched
      setSystemInstruction(initialSystemInstruction);
    }
  }, [initialSystemInstruction]);

  // Update capabilities and dependent settings when model changes
  useEffect(() => {
    const capabilities = updateSettingsBasedOnCapabilities(
      currentModel,
      null, // Pass null to use the default getModelCapabilities function
      { enableThinking, thinkingBudget },
      { setEnableGoogleSearch, setEnableCodeExecution, setEnableThinking, setThinkingBudget },
      { 
        enableThinking: localStorage.getItem(LS_KEYS.ENABLE_THINKING),
        thinkingBudget: localStorage.getItem(LS_KEYS.THINKING_BUDGET)
      }
    );
    
    setModelCapabilities(capabilities);
  }, [currentModel]);

  // --- Persistence Effects ---
  useEffect(() => {
    saveToStorage(LS_KEYS.CURRENT_MODEL, currentModel);
  }, [currentModel]);

  useEffect(() => {
    saveToStorage(LS_KEYS.CURRENT_VOICE, currentVoice);
  }, [currentVoice]);

  useEffect(() => {
    saveToStorage(LS_KEYS.TEMPERATURE, temperature, val => val.toString());
  }, [temperature]);

  useEffect(() => {
    saveToStorage(LS_KEYS.MAX_OUTPUT_TOKENS, maxOutputTokens, val => val.toString());
  }, [maxOutputTokens]);

  // Tool settings (enableGoogleSearch, enableCodeExecution) are no longer persisted to localStorage
  // This ensures fresh user selection each time and prevents stale values from overriding user choice

  // Persist thinking setting only if the model supports it AND the setting is true
  useEffect(() => {
    if (modelCapabilities.supportsThinking) {
      saveToStorage(LS_KEYS.ENABLE_THINKING, enableThinking, val => val.toString());
    } else {
      removeFromStorage(LS_KEYS.ENABLE_THINKING);
    }
  }, [enableThinking, modelCapabilities.supportsThinking]);

  useEffect(() => {
    if (modelCapabilities.supportsThinkingBudget) {
      saveToStorage(LS_KEYS.THINKING_BUDGET, thinkingBudget, val => val.toString());
    } else {
      removeFromStorage(LS_KEYS.THINKING_BUDGET);
    }
  }, [thinkingBudget, modelCapabilities.supportsThinkingBudget]);

  // --- Handlers ---
  const handleSystemInstructionSave = useCallback((newInstruction) => {
    if (modelCapabilities.supportsSystemInstruction) {
      setSystemInstruction(newInstruction);
      // TODO: Add backend call here if system instruction needs to be saved server-side
      console.log("System instruction updated (local state):", newInstruction);
    } else {
      console.warn("System instructions are not supported by the current model.");
    }
  }, [modelCapabilities.supportsSystemInstruction]); // Depend on capability


  // --- Return Values ---
  return {
    // State values
    currentModel,
    currentVoice,
    systemInstruction,
    temperature,
    maxOutputTokens,
    enableGoogleSearch,
    enableCodeExecution,
    enableThinking,
    thinkingBudget,

    // Setters
    setCurrentModel,
    setCurrentVoice,
    setSystemInstruction, // Allow direct setting if needed externally
    handleSystemInstructionSave, // Preferred way to update + save
    setTemperature,
    setMaxOutputTokens,
    setEnableGoogleSearch, // Need setter for the Switch component
    setEnableCodeExecution, // Need setter for the Switch component
    setEnableThinking,
    setThinkingBudget,

    // Capability flags
    isSystemInstructionApplicable: modelCapabilities.supportsSystemInstruction,
    isSearchSupportedByModel: modelCapabilities.supportsSearch,
    isCodeExecutionSupportedByModel: modelCapabilities.supportsCodeExecution,
    isThinkingSupportedByModel: modelCapabilities.supportsThinking,
    isThinkingBudgetSupportedByModel: modelCapabilities.supportsThinkingBudget,
  };
} 