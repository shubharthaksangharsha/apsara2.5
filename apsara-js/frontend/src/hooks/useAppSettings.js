import { useState, useEffect } from 'react';

const BACKEND_URL = 'http://localhost:9000'; // Consider moving to a config file

export function useAppSettings(initialSystemInstruction = 'You are a helpful assistant.') {
  const [currentModel, setCurrentModel] = useState('gemini-2.0-flash');
  const [currentVoice, setCurrentVoice] = useState('Puck'); // Default voice
  const [systemInstruction, setSystemInstruction] = useState(initialSystemInstruction);
  const [temperature, setTemperature] = useState(0.7);
  const [maxOutputTokens, setMaxOutputTokens] = useState(8192);
  const [enableGoogleSearch, setEnableGoogleSearch] = useState(false);
  const [enableCodeExecution, setEnableCodeExecution] = useState(false); // Placeholder

  // Update system instruction state if the initial prop changes (e.g., fetched async)
  useEffect(() => {
    setSystemInstruction(initialSystemInstruction);
  }, [initialSystemInstruction]);

  // Determine if system instruction is applicable based on the current model
  const isSystemInstructionApplicable = currentModel !== 'gemini-2.0-flash-exp-image-generation';

  const handleSystemInstructionSave = async (newInstruction) => {
    if (isSystemInstructionApplicable && newInstruction !== systemInstruction) {
      console.log("useAppSettings: Saving system instruction:", newInstruction);
      try {
        const sysRes = await fetch(`${BACKEND_URL}/system`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instruction: newInstruction })
        });
        if (!sysRes.ok) {
          const errData = await sysRes.json().catch(() => ({}));
          throw new Error(`Failed to save system instruction (Status: ${sysRes.status}) ${errData.error || ''}`);
        }
        setSystemInstruction(newInstruction); // Update state on success
        return true;
      } catch (err) {
        console.error('useAppSettings: Error saving system instruction:', err);
        alert(`Error saving settings: ${err.message}`);
        return false;
      }
    } else if (!isSystemInstructionApplicable) {
      console.log("useAppSettings: System instruction not applicable, not saving.");
      return true; // No action needed
    } else {
       console.log("useAppSettings: System instruction unchanged, not saving.");
       return true; // No action needed
    }
  };

  return {
    currentModel,
    setCurrentModel,
    currentVoice,
    setCurrentVoice,
    systemInstruction,
    setSystemInstruction, // Expose setter for direct updates if needed elsewhere (e.g., live prompt)
    handleSystemInstructionSave,
    temperature,
    setTemperature,
    maxOutputTokens,
    setMaxOutputTokens,
    enableGoogleSearch,
    setEnableGoogleSearch,
    enableCodeExecution,
    setEnableCodeExecution,
    isSystemInstructionApplicable,
  };
}