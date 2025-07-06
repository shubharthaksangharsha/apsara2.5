import React from 'react';
import { ChevronDown } from 'lucide-react';
import { FUNCTION_CALLING_MODES, FUNCTION_CALLING_MODE_DESCRIPTIONS } from '../../../hooks/useAppSettings/constants';

/**
 * Function Calling Mode Selector Component
 * 
 * @param {Object} props - Component props
 * @param {string} props.functionCallingMode - Current function calling mode
 * @param {Function} props.onFunctionCallingModeChange - Handler for mode change
 * @param {boolean} props.enabled - Whether function calling is enabled
 * @returns {JSX.Element} Function calling mode selector component
 */
export default function FunctionCallingModeSelector({
  functionCallingMode,
  onFunctionCallingModeChange,
  enabled
}) {

  const handleModeChange = (event) => {
    onFunctionCallingModeChange(event.target.value);
  };

  if (!enabled) {
    return null; // Don't show if function calling is disabled
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
        Function Calling Mode
      </label>
      <div className="relative">
        <select
          value={functionCallingMode}
          onChange={handleModeChange}
          className="w-full p-2 pr-8 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
        >
          {Object.entries(FUNCTION_CALLING_MODES).map(([key, value]) => (
            <option key={key} value={value}>
              {value}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {FUNCTION_CALLING_MODE_DESCRIPTIONS[functionCallingMode]}
      </p>
    </div>
  );
}
