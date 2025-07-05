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
  return (
    <div>
      <label htmlFor="thinkingBudget" className="block text-xs sm:text-sm font-medium mb-1">
        Thinking Budget: <span className="font-normal text-gray-500 dark:text-gray-400">({value})</span>
      </label>
      <input
        id="thinkingBudget"
        type="range"
        min={THINKING_BUDGET_MIN}
        max={THINKING_BUDGET_MAX}
        step={THINKING_BUDGET_STEP}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
      />
      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
        Set a budget for the thinking process (e.g., 100-1000). Only for compatible models. Set to 0 to disable if not automatically handled by the toggle.
      </p>
    </div>
  );
};

export default ThinkingBudgetControl; 