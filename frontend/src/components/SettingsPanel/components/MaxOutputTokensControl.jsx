import React from 'react';
import { MAX_OUTPUT_TOKENS_MIN, MAX_OUTPUT_TOKENS_MAX } from '../constants';

/**
 * Max Output Tokens input control component
 * 
 * @param {Object} props - Component props
 * @param {number} props.value - Current max output tokens value
 * @param {Function} props.onChange - Change handler
 * @returns {JSX.Element} Max output tokens control component
 */
const MaxOutputTokensControl = ({ value, onChange }) => {
  return (
    <div>
      <label htmlFor="maxOutputTokens" className="block text-xs sm:text-sm font-medium mb-1">
        Max Output Tokens
      </label>
      <input
        id="maxOutputTokens"
        type="number"
        min={MAX_OUTPUT_TOKENS_MIN}
        max={MAX_OUTPUT_TOKENS_MAX}
        step="1"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || MAX_OUTPUT_TOKENS_MIN)}
        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs sm:text-sm"
      />
      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
        Max length of the generated response.
      </p>
    </div>
  );
};

export default MaxOutputTokensControl; 