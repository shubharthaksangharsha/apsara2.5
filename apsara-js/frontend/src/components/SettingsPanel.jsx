import React, { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';

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
                disabled={!isSystemInstructionApplicable} // Disable if sys instruct not applicable, as tools often tied to it
                aria-disabled={!isSystemInstructionApplicable}
              />
              <div className={`relative w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600 ${!isSystemInstructionApplicable ? 'cursor-not-allowed opacity-50' : ''}`}></div>
            </label>
          </div>
          <p className={`text-xs text-gray-500 dark:text-gray-400 -mt-3 ${!isSystemInstructionApplicable ? 'opacity-50' : ''}`}>
            {!isSystemInstructionApplicable ? "Tools not applicable for this model." : "Allows the model to search Google. Requires backend support."}
          </p>

          {/* Code Execution Toggle Placeholder */}
          {/* ... */}

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