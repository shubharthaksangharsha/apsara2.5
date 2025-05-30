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
  enableThinking, // <-- New
  onEnableThinkingChange, // <-- New
  thinkingBudget, // <-- New
  onThinkingBudgetChange, // <-- New
  isSearchSupported,
  isCodeExecutionSupported,
  isThinkingSupported, // <-- New
  isThinkingBudgetSupported, // <-- New

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

  const handleThinkingToggle = (newValue) => {
    onEnableThinkingChange(newValue);
    if (!newValue) {
      onThinkingBudgetChange(0);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-end z-[60] transition-opacity duration-300 ease-in-out ${isOpen && isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={handleOverlayClick}
    >
      <div
        className={`w-full sm:max-w-md h-full bg-white dark:bg-gray-800 p-4 sm:p-6 shadow-xl flex flex-col text-gray-800 dark:text-gray-200
                  transform transition-transform duration-300 ease-in-out
                  ${isOpen && isVisible ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 sm:mb-6 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-1.5 sm:gap-2">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            Chat Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close settings"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Settings Form Area */}
        <div className="flex-1 space-y-4 sm:space-y-6 overflow-y-auto pr-1 custom-scrollbar">
          {/* System Instruction */}
          <div>
            <label htmlFor="systemInstruction" className={`block text-xs sm:text-sm font-medium mb-1 sm:mb-2 ${!isSystemInstructionApplicable ? 'text-gray-400 dark:text-gray-500' : ''}`}>
              System Instruction
            </label>
            <textarea
              id="systemInstruction"
              className={`w-full p-2 sm:p-3 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:border-gray-600 dark:text-gray-100 text-xs sm:text-sm ${!isSystemInstructionApplicable ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60' : 'bg-white dark:bg-gray-700'}`}
              rows={window.innerWidth < 640 ? 4 : 5}
              value={isSystemInstructionApplicable ? tempInstruction : ''}
              onChange={(e) => isSystemInstructionApplicable && setTempInstruction(e.target.value)}
              placeholder={isSystemInstructionApplicable ? "Set the AI's behavior (e.g., You are a helpful pirate)..." : "Not applicable for this model"}
              disabled={!isSystemInstructionApplicable}
              aria-disabled={!isSystemInstructionApplicable}
            />
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
              {isSystemInstructionApplicable
                 ? "Sets context for the AI (not used in Live mode or for image generation)."
                 : "System instructions are not supported by the selected model."
              }
            </p>
          </div>

          {/* Temperature */}
          <div>
            <label htmlFor="temperature" className="block text-xs sm:text-sm font-medium mb-1">
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
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
              Controls randomness (0 = deterministic, 1 = max randomness).
            </p>
          </div>

          {/* Max Output Tokens */}
          <div>
            <label htmlFor="maxOutputTokens" className="block text-xs sm:text-sm font-medium mb-1">
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
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs sm:text-sm"
            />
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
              Max length of the generated response.
            </p>
          </div>

          {/* Google Search Toggle */}
          <Switch.Group as="div" className="flex items-center justify-between py-2 sm:py-3">
            <span className="flex flex-grow flex-col mr-3">
              <Switch.Label
                as="span"
                className={`text-xs sm:text-sm font-medium leading-6 text-gray-900 dark:text-gray-100 ${!isSearchSupported || (enableCodeExecution && isCodeExecutionSupported) ? 'opacity-50' : ''}`}
                passive>
                Enable Google Search
              </Switch.Label>
              <Switch.Description as="span" className={`text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 ${!isSearchSupported || (enableCodeExecution && isCodeExecutionSupported) ? 'opacity-50' : ''}`}>
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
              className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${!isSearchSupported || (enableCodeExecution && isCodeExecutionSupported) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${enableGoogleSearch && isSearchSupported ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <span className="absolute inset-0 h-full w-full flex items-center justify-center transition-opacity">
                 <Search className={`h-2.5 w-2.5 sm:h-3 sm:w-3 text-indigo-600 ${enableGoogleSearch && isSearchSupported ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out'}`} />
                 <X className={`h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-400 dark:text-gray-500 ${enableGoogleSearch && isSearchSupported ? 'opacity-0 duration-100 ease-out' : 'opacity-100 duration-200 ease-in'}`} />
              </span>
              <span className={`pointer-events-none inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white dark:bg-gray-300 shadow ring-0 transition duration-200 ease-in-out ${enableGoogleSearch && isSearchSupported ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'}`} />
            </Switch>
          </Switch.Group>

          {/* Code Execution Toggle */}
          <Switch.Group as="div" className="flex items-center justify-between py-2 sm:py-3">
            <span className="flex flex-grow flex-col mr-3">
              <Switch.Label
                as="span"
                className={`text-xs sm:text-sm font-medium leading-6 text-gray-900 dark:text-gray-100 ${!isCodeExecutionSupported || (enableGoogleSearch && isSearchSupported) ? 'opacity-50' : ''}`}
                passive>
                Enable Code Execution
              </Switch.Label>
              <Switch.Description as="span" className={`text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 ${!isCodeExecutionSupported || (enableGoogleSearch && isSearchSupported) ? 'opacity-50' : ''}`}>
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
              className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${!isCodeExecutionSupported || (enableGoogleSearch && isSearchSupported) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${enableCodeExecution && isCodeExecutionSupported ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <span className="absolute inset-0 h-full w-full flex items-center justify-center transition-opacity">
                {/* Optional: Icons for on/off state if desired */}
              </span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${enableCodeExecution && isCodeExecutionSupported ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'}`}
              />
            </Switch>
          </Switch.Group>

          {/* Enable Thinking Process Toggle */}
          <Switch.Group as="div" className="flex items-center justify-between py-2 sm:py-3">
            <span className="flex flex-grow flex-col mr-3">
              <Switch.Label
                as="span"
                className={`text-xs sm:text-sm font-medium leading-6 text-gray-900 dark:text-gray-100 ${!isThinkingSupported ? 'opacity-50' : ''}`}
                passive
              >
                Enable Thinking Process
              </Switch.Label>
              {!isThinkingSupported && (
                <Switch.Description as="span" className="text-[10px] sm:text-xs text-red-500 dark:text-red-400">
                  Thinking process not supported by this model.
                </Switch.Description>
              )}
            </span>
            <Switch
              checked={enableThinking && isThinkingSupported}
              onChange={handleThinkingToggle}
              disabled={!isThinkingSupported}
              className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${!isThinkingSupported ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${enableThinking && isThinkingSupported ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <span className="absolute inset-0 h-full w-full flex items-center justify-center transition-opacity">
                {/* Optional: Icons for on/off state if desired */}
              </span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out
                  ${enableThinking && isThinkingSupported ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </Switch>
          </Switch.Group>

          {/* Thinking Budget Slider (conditionally rendered) */}
          {enableThinking && isThinkingSupported && isThinkingBudgetSupported && (
            <div>
              <label htmlFor="thinkingBudget" className="block text-xs sm:text-sm font-medium mb-1">
                Thinking Budget: <span className="font-normal text-gray-500 dark:text-gray-400">({thinkingBudget})</span>
              </label>
              <input
                id="thinkingBudget"
                type="range"
                min="0" // Or a more sensible minimum like 100 if 0 means disabled
                max="2000" // As per your requirement, though 1000 was mentioned as default
                step="50" // Or any other appropriate step
                value={thinkingBudget}
                onChange={(e) => onThinkingBudgetChange(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                Set a budget for the thinking process (e.g., 100-1000). Only for compatible models. Set to 0 to disable if not automatically handled by the toggle.
              </p>
            </div>
          )}

        </div>

        {/* Footer with Save/Cancel Buttons */}
        <div className="mt-auto pt-4 sm:pt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 rounded-md text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-3 py-2 sm:px-4 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors text-xs sm:text-sm"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}