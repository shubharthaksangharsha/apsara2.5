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
      <textarea
        id="systemInstruction"
        className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:border-gray-600 dark:text-gray-100 text-sm ${
          !isApplicable 
            ? 'bg-gray-800 dark:bg-gray-800 cursor-not-allowed opacity-60' 
            : 'bg-gray-700 dark:bg-gray-700'
        }`}
        rows={window.innerWidth < MOBILE_BREAKPOINT ? 4 : 5}
        value={isApplicable ? value : ''}
        onChange={(e) => isApplicable && onChange(e.target.value)}
        placeholder={isApplicable 
          ? "Set the AI's behavior (e.g., You are a helpful assistant)..." 
          : "Not applicable for this model"
        }
        disabled={!isApplicable}
        aria-disabled={!isApplicable}
      />
    </div>
  );
};

export default SystemInstructionField; 