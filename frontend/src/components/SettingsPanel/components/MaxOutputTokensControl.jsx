import React from 'react';
import { MAX_OUTPUT_TOKENS_MIN, MAX_OUTPUT_TOKENS_MAX, MAX_OUTPUT_TOKENS_STEP } from '../constants';

/**
 * Max Output Tokens slider control component
 * 
 * @param {Object} props - Component props
 * @param {number} props.value - Current max output tokens value
 * @param {Function} props.onChange - Change handler
 * @returns {JSX.Element} Max output tokens control component
 */
const MaxOutputTokensControl = ({ value, onChange }) => {
  return (
    <div>
      <input
        id="maxOutputTokens"
        type="range"
        min={MAX_OUTPUT_TOKENS_MIN}
        max={MAX_OUTPUT_TOKENS_MAX}
        step={MAX_OUTPUT_TOKENS_STEP}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-2 bg-gray-700 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
      />
    </div>
  );
};

export default MaxOutputTokensControl; 