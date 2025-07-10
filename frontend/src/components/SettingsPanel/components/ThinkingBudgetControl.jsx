import React from 'react';
import { THINKING_BUDGET_MIN, THINKING_BUDGET_MAX, THINKING_BUDGET_STEP } from '../constants';

/**
 * Thinking Budget slider control component
 * 
 * @param {Object} props - Component props
 * @param {number} props.value - Current thinking budget value
 * @param {Function} props.onChange - Change handler
 * @returns {JSX.Element} Thinking budget control component
 */
const ThinkingBudgetControl = ({ value, onChange }) => {
  // Special handling for dynamic thinking mode (-1)
  const displayValue = value === -1 ? 0 : value;
  
  const handleChange = (e) => {
    const newValue = parseInt(e.target.value, 10);
    // If slider is at minimum, set to -1 for dynamic thinking
    if (newValue === 0) {
      onChange(-1);
    } else {
      onChange(newValue);
    }
  };
  
  return (
    <div>
      <input
        id="thinkingBudget"
        type="range"
        min={0} // Use 0 as visual minimum, but map to -1 internally
        max={THINKING_BUDGET_MAX}
        step={THINKING_BUDGET_STEP}
        value={displayValue}
        onChange={handleChange}
        className="w-full h-2 bg-gray-700 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
      />
    </div>
  );
};

export default ThinkingBudgetControl; 