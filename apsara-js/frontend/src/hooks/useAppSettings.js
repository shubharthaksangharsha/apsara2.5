import { useState, useEffect, useCallback } from 'react';
import { getModelCapabilities } from '../utils/modelCapabilities'; // Import the utility

const BACKEND_URL = 'http://localhost:9000'; // Consider moving to a config file

export function useAppSettings(initialSystemInstruction) {
  // --- State Initialization ---
  const [currentModel, setCurrentModel] = useState(() => localStorage.getItem('currentModel') || ''); // Default might come from fetched models later
  const [currentVoice, setCurrentVoice] = useState(() => localStorage.getItem('currentVoice') || ''); // For TTS if used elsewhere
  const [systemInstruction, setSystemInstruction] = useState(''); // Initialize empty, set later
  const [temperature, setTemperature] = useState(() => parseFloat(localStorage.getItem('temperature') || '0.7'));
  const [maxOutputTokens, setMaxOutputTokens] = useState(() => parseInt(localStorage.getItem('maxOutputTokens') || '8192', 10)); // Default to 8k often safer
  const [enableGoogleSearch, setEnableGoogleSearch] = useState(false); // Initialize false, enable later based on model/saved state
  const [enableCodeExecution, setEnableCodeExecution] = useState(false); // Initialize false

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
    const capabilities = getModelCapabilities(currentModel);
    setModelCapabilities(capabilities);

    // Load saved search state only if supported, otherwise force disable
    const savedSearch = localStorage.getItem('enableGoogleSearch') === 'true';
    if (capabilities.supportsSearch) {
      setEnableGoogleSearch(savedSearch);
    } else {
      setEnableGoogleSearch(false);
    }

    // Load saved code execution state only if supported, otherwise force disable
    const savedCodeExec = localStorage.getItem('enableCodeExecution') === 'true';
     if (capabilities.supportsCodeExecution) {
       setEnableCodeExecution(savedCodeExec);
     } else {
       setEnableCodeExecution(false);
     }

  }, [currentModel]);

  // --- Persistence Effects ---
  useEffect(() => {
    localStorage.setItem('currentModel', currentModel);
  }, [currentModel]);

  useEffect(() => {
    localStorage.setItem('currentVoice', currentVoice);
  }, [currentVoice]);

  useEffect(() => {
    localStorage.setItem('temperature', temperature.toString());
  }, [temperature]);

  useEffect(() => {
    localStorage.setItem('maxOutputTokens', maxOutputTokens.toString());
  }, [maxOutputTokens]);

  // Persist search setting only if the model supports it AND the setting is true
  useEffect(() => {
    if (modelCapabilities.supportsSearch) {
      localStorage.setItem('enableGoogleSearch', enableGoogleSearch.toString());
    } else {
      localStorage.removeItem('enableGoogleSearch'); // Clean up if not supported
    }
  }, [enableGoogleSearch, modelCapabilities.supportsSearch]);

  // Persist code execution setting only if the model supports it AND the setting is true
  useEffect(() => {
    if (modelCapabilities.supportsCodeExecution) {
      localStorage.setItem('enableCodeExecution', enableCodeExecution.toString());
    } else {
      localStorage.removeItem('enableCodeExecution'); // Clean up if not supported
    }
  }, [enableCodeExecution, modelCapabilities.supportsCodeExecution]);

  // --- Handlers ---
  const handleSystemInstructionSave = useCallback((newInstruction) => {
    if (modelCapabilities.supportsSystemInstruction) {
      setSystemInstruction(newInstruction);
      // TODO: Add backend call here if system instruction needs to be saved server-side
      // e.g., fetch(`${BACKEND_URL}/system`, { method: 'POST', ... });
      // For now, it's only saved in local state within the hook instance
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

    // Setters
    setCurrentModel,
    setCurrentVoice,
    setSystemInstruction, // Allow direct setting if needed externally
    handleSystemInstructionSave, // Preferred way to update + save
    setTemperature,
    setMaxOutputTokens,
    setEnableGoogleSearch, // Need setter for the Switch component
    setEnableCodeExecution, // Need setter for the Switch component

    // Capability flags
    isSystemInstructionApplicable: modelCapabilities.supportsSystemInstruction,
    isSearchSupportedByModel: modelCapabilities.supportsSearch,
    isCodeExecutionSupportedByModel: modelCapabilities.supportsCodeExecution,
  };
}