import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Switch } from '@headlessui/react';
import ToolSelector from './ToolSelector';

const ChatSettings = ({
  onClose,
  temperature,
  onTemperatureChange,
  maxOutputTokens,
  onMaxOutputTokensChange,
  systemInstruction,
  onSystemInstructionChange,
  isSystemInstructionApplicable,
  onIsSystemInstructionApplicableChange,
  enableSearch,
  onEnableSearchChange,
  enableCodeExecution,
  onEnableCodeExecutionChange,
  enableThinking,
  onEnableThinkingChange,
  thinkingBudget,
  onThinkingBudgetChange,
  enableFunctionCalling,
  onEnableFunctionCallingChange,
  selectedTools,
  onSelectedToolsChange,
  functionCallingMode,
  onFunctionCallingModeChange
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  return (
    <div className="fixed inset-0 flex justify-center items-center z-50 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 p-5 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Chat Settings
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* System Instruction (Primary setting) */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="system-instruction" className="font-medium text-sm">System Instruction</label>
              <Switch
                checked={isSystemInstructionApplicable}
                onChange={onIsSystemInstructionApplicableChange}
                className={`${
                  isSystemInstructionApplicable ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
              >
                <span className={`${
                  isSystemInstructionApplicable ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
              </Switch>
            </div>
            <textarea
              id="system-instruction"
              className={`w-full p-3 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 ${
                !isSystemInstructionApplicable ? 'opacity-50' : ''
              }`}
              rows="4"
              value={systemInstruction}
              onChange={e => onSystemInstructionChange(e.target.value)}
              disabled={!isSystemInstructionApplicable}
              placeholder="Set custom instructions for the AI..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Sets context for the AI (not used in Live mode or for image generation).
            </p>
          </div>

          {/* Core Features Section */}
          <div className="space-y-3">
            {/* Apsara Abilities Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Apsara Abilities</h3>
                <div className="space-x-2">
                  <Switch
                    checked={enableFunctionCalling}
                    onChange={onEnableFunctionCallingChange}
                    className={`${
                      enableFunctionCalling ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                  >
                    <span className={`${
                      enableFunctionCalling ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
                  </Switch>
                </div>
              </div>

              {enableFunctionCalling && (
                <div className="mt-2">
                  <div className="mb-2">
                    <ToolSelector 
                      selectedTools={selectedTools} 
                      onSelectedToolsChange={onSelectedToolsChange}
                    />
                  </div>
                  <div className="mb-1">
                    <label className="block text-sm font-medium">Function Calling Mode</label>
                    <select
                      value={functionCallingMode}
                      onChange={e => onFunctionCallingModeChange(e.target.value)}
                      className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                    >
                      <option value="AUTO">AUTO - Model decides when to call functions (recommended)</option>
                      <option value="NONE">NONE - Never call functions</option>
                      <option value="ANY">ANY - Always consider calling functions</option>
                    </select>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Allow the model to use tools and functions
              </p>
            </div>

            {/* AI Learning & Research */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">AI Learning & Research</h3>
              </div>
              
              <div className="space-y-3">
                {/* Google Search */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Enable Google Search</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Allows the model to search the web for current info.
                    </p>
                  </div>
                  <Switch
                    checked={enableSearch}
                    onChange={onEnableSearchChange}
                    className={`${
                      enableSearch ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                  >
                    <span className={`${
                      enableSearch ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
                  </Switch>
                </div>

                {/* Code Execution */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Enable Code Execution</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Allows the model to execute code (e.g., Python).
                    </p>
                  </div>
                  <Switch
                    checked={enableCodeExecution}
                    onChange={onEnableCodeExecutionChange}
                    className={`${
                      enableCodeExecution ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                  >
                    <span className={`${
                      enableCodeExecution ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
                  </Switch>
                </div>

                {/* Thinking Process */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Enable Thinking Process</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {enableThinking 
                        ? "Uses advanced reasoning for complex tasks." 
                        : "Thinking process not supported by this model."}
                    </p>
                  </div>
                  <Switch
                    checked={enableThinking}
                    onChange={onEnableThinkingChange}
                    className={`${
                      enableThinking ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                  >
                    <span className={`${
                      enableThinking ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
                  </Switch>
                </div>

                {/* Thinking Budget (only show if thinking is enabled) */}
                {enableThinking && (
                  <div>
                    <label className="block text-sm">Thinking Budget: {thinkingBudget === -1 ? "Dynamic" : thinkingBudget}</label>
                    <input
                      type="range"
                      min="-1"
                      max="24000"
                      step="1000"
                      value={thinkingBudget}
                      onChange={e => onThinkingBudgetChange(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 mt-1"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Dynamic</span>
                      <span>Max</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Advanced Settings (collapsible) */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <button 
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="font-medium">Advanced Settings</h3>
                {showAdvancedSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showAdvancedSettings && (
                <div className="mt-3 space-y-3">
                  {/* Temperature */}
                  <div>
                    <label className="block text-sm">Temperature: {temperature.toFixed(1)}</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={temperature}
                      onChange={e => onTemperatureChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 mt-1"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Deterministic</span>
                      <span>Random</span>
                    </div>
                  </div>

                  {/* Max Output Tokens */}
                  <div>
                    <label className="block text-sm mb-1">Max Output Tokens</label>
                    <input
                      type="number"
                      value={maxOutputTokens}
                      onChange={e => onMaxOutputTokensChange(parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                      min="1"
                      max="32768"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Max length of the generated response.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSettings; 