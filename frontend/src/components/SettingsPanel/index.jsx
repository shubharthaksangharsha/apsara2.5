import React, { useState, useEffect } from 'react';
import { Settings, X, ChevronDown, ChevronUp } from 'lucide-react';
import SystemInstructionPanel from '../SystemInstructionPanel';
import TemperatureControl from './components/TemperatureControl';
import MaxOutputTokensControl from './components/MaxOutputTokensControl';
import ThinkingBudgetControl from './components/ThinkingBudgetControl';
import { ANIMATION_DURATION } from './constants';

/**
 * Settings Panel component for configuring chat behavior
 * 
 * @param {Object} props - Component props
 * @param {string} props.currentModel - Currently selected model ID
 * @param {boolean} props.isSystemInstructionApplicable - Whether system instructions are applicable for the current model
 * @param {string} props.systemInstruction - Current system instruction
 * @param {Function} props.onSystemInstructionChange - System instruction change handler
 * @param {number} props.temperature - Current temperature value
 * @param {Function} props.onTemperatureChange - Temperature change handler
 * @param {number} props.maxOutputTokens - Current max output tokens value
 * @param {Function} props.onMaxOutputTokensChange - Max output tokens change handler
 * @param {boolean} props.enableGoogleSearch - Whether Google search is enabled
 * @param {Function} props.onEnableGoogleSearchChange - Google search toggle handler
 * @param {boolean} props.enableCodeExecution - Whether code execution is enabled
 * @param {Function} props.onEnableCodeExecutionChange - Code execution toggle handler
 * @param {boolean} props.enableThinking - Whether thinking process is enabled
 * @param {Function} props.onEnableThinkingChange - Thinking process toggle handler
 * @param {number} props.thinkingBudget - Current thinking budget value
 * @param {Function} props.onThinkingBudgetChange - Thinking budget change handler
 * @param {boolean} props.isSearchSupported - Whether search is supported by the current model
 * @param {boolean} props.isCodeExecutionSupported - Whether code execution is supported by the current model
 * @param {boolean} props.isThinkingSupported - Whether thinking process is supported by the current model
 * @param {boolean} props.isThinkingBudgetSupported - Whether thinking budget is supported by the current model
 * @param {boolean} props.enableFunctionCalling - Whether function calling is enabled
 * @param {Function} props.onEnableFunctionCallingChange - Function calling toggle handler
 * @param {Array} props.selectedTools - Array of selected tool names
 * @param {Function} props.onSelectedToolsChange - Handler for selected tools change
 * @param {string} props.functionCallingMode - Current function calling mode
 * @param {Function} props.onFunctionCallingModeChange - Function calling mode change handler
 * @param {boolean} props.isAuthenticated - Whether user is authenticated
 * @param {boolean} props.isOpen - Whether the panel is open
 * @param {Function} props.onClose - Close handler
 * @returns {JSX.Element} Settings panel component
 */
export default function SettingsPanel({
  // Model Info
  currentModel,
  isSystemInstructionApplicable,

  // Settings State & Handlers
  systemInstruction,
  onSystemInstructionChange,
  temperature,
  onTemperatureChange,
  maxOutputTokens,
  onMaxOutputTokensChange,
  enableGoogleSearch,
  onEnableGoogleSearchChange,
  enableCodeExecution,
  onEnableCodeExecutionChange,
  enableThinking,
  onEnableThinkingChange,
  thinkingBudget,
  onThinkingBudgetChange,
  isSearchSupported,
  isCodeExecutionSupported,
  isThinkingSupported,
  isThinkingBudgetSupported,
  enableFunctionCalling,
  onEnableFunctionCallingChange,
  selectedTools,
  onSelectedToolsChange,
  functionCallingMode,
  onFunctionCallingModeChange,
  isAuthenticated,

  // Panel Visibility
  isOpen,
  onClose
}) {
  // Local state for editing within the panel
  const [tempInstruction, setTempInstruction] = useState(systemInstruction);
  const [isVisible, setIsVisible] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Sync local temp state if the prop changes
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
    const saveSuccess = await onSystemInstructionChange(tempInstruction);
    if (saveSuccess !== false) {
      onClose();
    }
  };

  // Feature toggle handlers
  const handleSearchToggle = (newValue) => {
    onEnableGoogleSearchChange(newValue);
    
    // If turning search ON, turn code execution and function calling OFF
    if (newValue) {
      onEnableCodeExecutionChange(false);
      onEnableFunctionCallingChange(false);
    }
  };

  const handleCodeExecToggle = (newValue) => {
    onEnableCodeExecutionChange(newValue);
    
    // If turning code execution ON, turn search and function calling OFF
    if (newValue) {
      onEnableGoogleSearchChange(false);
      onEnableFunctionCallingChange(false);
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
  };

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-end z-[60] transition-opacity duration-300 ease-in-out ${isOpen && isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={handleOverlayClick}
    >
      <div
        className={`w-full sm:max-w-md h-full bg-gray-900 dark:bg-gray-900 p-4 sm:p-6 shadow-xl flex flex-col text-gray-100 dark:text-gray-100
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
            className="p-1.5 sm:p-2 rounded-full text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
            aria-label="Close settings"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Settings Form Area */}
        <div className="flex-1 space-y-6 overflow-y-auto pr-1 custom-scrollbar">
          {/* System Instruction */}
          <SystemInstructionPanel
            value={tempInstruction}
            onChange={setTempInstruction}
            isApplicable={isSystemInstructionApplicable}
          />

          {/* Advanced Model Settings (collapsible) */}
          <div className="bg-gray-800 rounded-xl p-4 shadow-md">
            <button 
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-sm font-medium text-gray-300">Advanced Model Settings</h3>
              {showAdvancedSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAdvancedSettings && (
              <div className="mt-4 space-y-5">
                {/* Temperature */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-gray-400">Temperature: {temperature.toFixed(1)}</label>
                    <span className="text-xs text-gray-400">
                      {temperature < 0.3 ? 'Deterministic' : 
                       temperature > 0.9 ? 'Random' : 
                       temperature === 0.7 ? 'Balanced' : ''}
                    </span>
                  </div>
                  <TemperatureControl
                    value={temperature}
                    onChange={onTemperatureChange}
                  />
                </div>
              
                {/* Max Output Tokens */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-gray-400">Max Output Tokens: {maxOutputTokens}</label>
                    <span className="text-xs text-gray-400"></span>
                  </div>
                  <MaxOutputTokensControl
                    value={maxOutputTokens}
                    onChange={onMaxOutputTokensChange}
                    currentModel={currentModel}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum length of the generated response.
                  </p>
                </div>

                {/* Show Thoughts Toggle (only for Gemini 2.5 models) */}
                {isThinkingSupported && (
                  <div className="pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium text-gray-400">Show Thoughts</h3>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={enableThinking}
                          onChange={(e) => handleThinkingToggle(e.target.checked)}
                          disabled={!isThinkingSupported}
                        />
                        <div className={`w-9 h-5 bg-gray-600 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${!isThinkingSupported ? 'opacity-50' : ''}`}></div>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 mb-3">
                      {isThinkingSupported 
                        ? "Shows the model's reasoning process for complex tasks." 
                        : "Thinking process not supported by this model."}
                    </p>
                  </div>
                )}

                {/* Thinking Budget (only show if thinking is enabled) */}
                {enableThinking && isThinkingSupported && isThinkingBudgetSupported && (
                  <div className="pt-2">
                    <h3 className="text-xs font-medium text-gray-400 mb-2">Thinking Budget</h3>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-400">
                        {thinkingBudget === -1 ? "Dynamic (Auto)" : thinkingBudget === 0 ? "Disabled" : `${thinkingBudget} tokens`}
                      </span>
                    </div>
                    <ThinkingBudgetControl
                      value={thinkingBudget}
                      onChange={onThinkingBudgetChange}
                      currentModel={currentModel}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Dynamic</span>
                      <span>Max</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {thinkingBudget === -1 
                        ? "Model automatically adjusts thinking based on complexity." 
                        : thinkingBudget === 0
                        ? "Thinking process is disabled."
                        : "Higher values allow more detailed reasoning for complex tasks."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer with Save/Cancel Buttons */}
        <div className="mt-auto pt-4 sm:pt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-3 py-2 sm:px-4 border border-gray-600 rounded-md text-xs sm:text-sm text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-3 py-2 sm:px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-xs sm:text-sm"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
} 