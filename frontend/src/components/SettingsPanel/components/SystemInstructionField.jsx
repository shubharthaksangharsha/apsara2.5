import React from 'react';
import { MOBILE_BREAKPOINT } from '../constants';

/**
 * System Instruction textarea field component
 * 
 * @param {Object} props - Component props
 * @param {string} props.value - Current instruction value
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.isApplicable - Whether system instructions are applicable for the current model
 * @returns {JSX.Element} System instruction field component
 */
const SystemInstructionField = ({ value, onChange, isApplicable }) => {
  return (
    <div>
      <label 
        htmlFor="systemInstruction" 
        className={`block text-xs sm:text-sm font-medium mb-1 sm:mb-2 ${
          !isApplicable ? 'text-gray-400 dark:text-gray-500' : ''
        }`}
      >
        System Instruction
      </label>
      <textarea
        id="systemInstruction"
        className={`w-full p-2 sm:p-3 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:border-gray-600 dark:text-gray-100 text-xs sm:text-sm ${
          !isApplicable 
            ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60' 
            : 'bg-white dark:bg-gray-700'
        }`}
        rows={window.innerWidth < MOBILE_BREAKPOINT ? 4 : 5}
        value={isApplicable ? value : ''}
        onChange={(e) => isApplicable && onChange(e.target.value)}
        placeholder={isApplicable 
          ? "Set the AI's behavior (e.g., You are a helpful pirate)..." 
          : "Not applicable for this model"
        }
        disabled={!isApplicable}
        aria-disabled={!isApplicable}
      />
      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
        {isApplicable
          ? "Sets context for the AI (not used in Live mode or for image generation)."
          : "System instructions are not supported by the selected model."
        }
      </p>
    </div>
  );
};

export default SystemInstructionField; 