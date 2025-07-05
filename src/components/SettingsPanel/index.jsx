import React, { useState, useEffect } from 'react';
import { Settings, X, Search, Code } from 'lucide-react';
import SystemInstructionField from './components/SystemInstructionField';
import TemperatureControl from './components/TemperatureControl';
import MaxOutputTokensControl from './components/MaxOutputTokensControl';
import FeatureToggle from './components/FeatureToggle';
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

  // Panel Visibility
  isOpen,
  onClose
}) {
  // Local state for editing within the panel
  const [tempInstruction, setTempInstruction] = useState(systemInstruction);
  const [isVisible, setIsVisible] = useState(false);

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
  };

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
          <SystemInstructionField
            value={tempInstruction}
            onChange={setTempInstruction}
            isApplicable={isSystemInstructionApplicable}
          />

          {/* Temperature */}
          <TemperatureControl
            value={temperature}
            onChange={onTemperatureChange}
          />

          {/* Max Output Tokens */}
          <MaxOutputTokensControl
            value={maxOutputTokens}
            onChange={onMaxOutputTokensChange}
          />

          {/* Google Search Toggle */}
          <FeatureToggle
            label="Enable Google Search"
            description={isSearchSupported
              ? "Allows the model to search the web for current info."
              : "Search not supported by this model."
            }
            checked={enableGoogleSearch && isSearchSupported}
            onChange={handleSearchToggle}
            disabled={!isSearchSupported || (enableCodeExecution && isCodeExecutionSupported)}
            icon={
              <span className="absolute inset-0 h-full w-full flex items-center justify-center transition-opacity">
                <Search className={`h-2.5 w-2.5 sm:h-3 sm:w-3 text-indigo-600 ${enableGoogleSearch && isSearchSupported ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out'}`} />
                <X className={`h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-400 dark:text-gray-500 ${enableGoogleSearch && isSearchSupported ? 'opacity-0 duration-100 ease-out' : 'opacity-100 duration-200 ease-in'}`} />
              </span>
            }
          />

          {/* Code Execution Toggle */}
          <FeatureToggle
            label="Enable Code Execution"
            description={isCodeExecutionSupported
              ? "Allows the model to execute code (e.g., Python)."
              : "Code execution not supported by this model."
            }
            checked={enableCodeExecution && isCodeExecutionSupported}
            onChange={handleCodeExecToggle}
            disabled={!isCodeExecutionSupported || (enableGoogleSearch && isSearchSupported)}
            icon={
              <Code className={`h-2.5 w-2.5 sm:h-3 sm:w-3 text-indigo-600 ${enableCodeExecution && isCodeExecutionSupported ? 'opacity-100' : 'opacity-0'}`} />
            }
          />

          {/* Enable Thinking Process Toggle */}
          <FeatureToggle
            label="Enable Thinking Process"
            description={isThinkingSupported
              ? "Enables the model's thinking process for complex tasks."
              : "Thinking process not supported by this model."
            }
            checked={enableThinking && isThinkingSupported}
            onChange={handleThinkingToggle}
            disabled={!isThinkingSupported}
          />

          {/* Thinking Budget Slider (conditionally rendered) */}
          {enableThinking && isThinkingSupported && isThinkingBudgetSupported && (
            <ThinkingBudgetControl
              value={thinkingBudget}
              onChange={onThinkingBudgetChange}
            />
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