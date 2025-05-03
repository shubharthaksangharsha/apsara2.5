import React, { useState, useEffect } from 'react';
import { Settings, X, Search, Code } from 'lucide-react';
import { Switch } from '@headlessui/react';

export default function SettingsPanel({
  // Model Info (Passed down)
  currentModel, // Keep this if needed for display, though not used in current JSX
  isSystemInstructionApplicable,

  // Settings State & Handlers (Passed from App.jsx)
  systemInstruction,
  onSystemInstructionChange, // This should now be the SAVE handler from App.jsx
  temperature,
  onTemperatureChange,
  maxOutputTokens,
  onMaxOutputTokensChange,
  enableGoogleSearch,
  onEnableGoogleSearchChange,
  enableCodeExecution,
  onEnableCodeExecutionChange,
  isSearchSupported,
  isCodeExecutionSupported,

  // Panel Visibility
  isOpen,
  onClose
}) {
  // Local state for editing within the panel
  const [tempInstruction, setTempInstruction] = useState(systemInstruction);
  const [isVisible, setIsVisible] = useState(false);

  // Sync local temp state if the prop changes (e.g., panel reopened or sysInstruct loaded async)
  useEffect(() => {
    setTempInstruction(systemInstruction);
  }, [systemInstruction]);

  // Handle panel open/close animation
  useEffect(() => {
    let timeoutId;
    if (isOpen) {
      timeoutId = setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
    return () => clearTimeout(timeoutId);
  }, [isOpen]);

  const handleSave = async () => {
    // Call the handler passed from App.jsx to save the system instruction
    // The handler in App.jsx will perform the fetch and state update
    const saveSuccess = await onSystemInstructionChange(tempInstruction);

    // Only close if the save was successful (or no change needed)
    // The handler in App.jsx should return true/false or handle errors appropriately
    if (saveSuccess !== false) { // Assuming handler returns false on error
       onClose(); // Close the panel
    } else {
        // Optionally keep the panel open and show an error message if saving failed
        console.error("SettingsPanel: Save failed, keeping panel open.");
        // You could add a local error state here to display feedback
    }
  };

  // --- Interactivity Handlers for Toggles ---
  const handleSearchToggle = (newValue) => {
    onEnableGoogleSearchChange(newValue);
    // If turning search ON, turn code execution OFF
    if (newValue) {
      onEnableCodeExecutionChange(false);
    }
  };

  const handleCodeExecToggle = (newValue) => {
    onEnableCodeExecutionChange(newValue);
    // If turning code execution ON, turn search OFF
    if (newValue) {
      onEnableGoogleSearchChange(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-end z-50 transition-opacity duration-300 ease-in-out ${isOpen && isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={handleOverlayClick}
    >
      <div
        className={`w-full max-w-md h-full bg-white dark:bg-gray-800 p-6 shadow-xl flex flex-col text-gray-800 dark:text-gray-200
                  transform transition-transform duration-300 ease-in-out
                  ${isOpen && isVisible ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Chat Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Settings Form Area */}
        <div className="flex-1 space-y-6 overflow-y-auto pr-1 custom-scrollbar">
          {/* System Instruction */}
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
              placeholder={isSystemInstructionApplicable ? "Set the AI's behavior (e.g., You are a helpful pirate)..." : "Not applicable for this model"}
              disabled={!isSystemInstructionApplicable}
              aria-disabled={!isSystemInstructionApplicable}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {isSystemInstructionApplicable
                 ? "Sets context for the AI (not used in Live mode or for image generation)."
                 : "System instructions are not supported by the selected model."
              }
            </p>
          </div>

          {/* Temperature */}
          <div>
            <label htmlFor="temperature" className="block text-sm font-medium mb-1">
              Temperature: <span className="font-normal text-gray-500 dark:text-gray-400">({temperature.toFixed(1)})</span>
            </label>
            <input
              id="temperature"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Controls randomness (0 = deterministic, 1 = max randomness).
            </p>
          </div>

          {/* Max Output Tokens */}
          <div>
            <label htmlFor="maxOutputTokens" className="block text-sm font-medium mb-1">
              Max Output Tokens
            </label>
            <input
              id="maxOutputTokens"
              type="number"
              min="1"
              max="8192"
              step="1"
              value={maxOutputTokens}
              onChange={(e) => onMaxOutputTokensChange(parseInt(e.target.value, 10) || 1)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Max length of the generated response.
            </p>
          </div>

          {/* Google Search Toggle */}
          <Switch.Group as="div" className="flex items-center justify-between py-3">
            <span className="flex flex-grow flex-col">
              <Switch.Label
                as="span"
                className={`text-sm font-medium leading-6 text-gray-900 dark:text-gray-100 ${!isSearchSupported || (enableCodeExecution && isCodeExecutionSupported) ? 'opacity-50' : ''}`}
                passive>
                Enable Google Search
              </Switch.Label>
              <Switch.Description as="span" className={`text-xs text-gray-500 dark:text-gray-400 ${!isSearchSupported || (enableCodeExecution && isCodeExecutionSupported) ? 'opacity-50' : ''}`}>
                {isSearchSupported
                  ? "Allows the model to search the web for current info."
                  : "Search not supported by this model."
                }
              </Switch.Description>
            </span>
            <Switch
              checked={enableGoogleSearch && isSearchSupported}
              onChange={handleSearchToggle}
              disabled={!isSearchSupported || (enableCodeExecution && isCodeExecutionSupported)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${!isSearchSupported || (enableCodeExecution && isCodeExecutionSupported) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${enableGoogleSearch && isSearchSupported ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <span className="absolute inset-0 h-full w-full flex items-center justify-center transition-opacity">
                 <Search className={`h-3 w-3 text-indigo-600 ${enableGoogleSearch && isSearchSupported ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out'}`} />
                 <X className={`h-3 w-3 text-gray-400 dark:text-gray-500 ${enableGoogleSearch && isSearchSupported ? 'opacity-0 duration-100 ease-out' : 'opacity-100 duration-200 ease-in'}`} />
              </span>
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-300 shadow ring-0 transition duration-200 ease-in-out ${enableGoogleSearch && isSearchSupported ? 'translate-x-5' : 'translate-x-0'}`} />
            </Switch>
          </Switch.Group>

          {/* Code Execution Toggle */}
          <Switch.Group as="div" className="flex items-center justify-between py-3">
            <span className="flex flex-grow flex-col">
              <Switch.Label
                as="span"
                className={`text-sm font-medium leading-6 text-gray-900 dark:text-gray-100 ${!isCodeExecutionSupported || (enableGoogleSearch && isSearchSupported) ? 'opacity-50' : ''}`}
                passive>
                Enable Code Execution
              </Switch.Label>
              <Switch.Description as="span" className={`text-xs text-gray-500 dark:text-gray-400 ${!isCodeExecutionSupported || (enableGoogleSearch && isSearchSupported) ? 'opacity-50' : ''}`}>
                {isCodeExecutionSupported
                  ? "Allows the model to execute code (e.g., Python)."
                  : "Code execution not supported by this model."
                }
              </Switch.Description>
            </span>
            <Switch
              checked={enableCodeExecution && isCodeExecutionSupported}
              onChange={handleCodeExecToggle}
              disabled={!isCodeExecutionSupported || (enableGoogleSearch && isSearchSupported)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${!isCodeExecutionSupported || (enableGoogleSearch && isSearchSupported) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${enableCodeExecution && isCodeExecutionSupported ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <span className="absolute inset-0 h-full w-full flex items-center justify-center transition-opacity">
                    <Code className={`h-3 w-3 text-indigo-600 ${enableCodeExecution && isCodeExecutionSupported ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out'}`} />
                    <X className={`h-3 w-3 text-gray-400 dark:text-gray-500 ${enableCodeExecution && isCodeExecutionSupported ? 'opacity-0 duration-100 ease-out' : 'opacity-100 duration-200 ease-in'}`} />
              </span>
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-300 shadow ring-0 transition duration-200 ease-in-out ${enableCodeExecution && isCodeExecutionSupported ? 'translate-x-5' : 'translate-x-0'}`} />
            </Switch>
          </Switch.Group>
        </div>

        {/* Footer Buttons */}
        <div className="mt-auto pt-6 flex justify-end space-x-4 flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}