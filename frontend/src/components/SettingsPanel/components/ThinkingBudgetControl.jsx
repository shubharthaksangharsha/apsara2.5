import React, { useState, useMemo } from 'react';
import { THINKING_BUDGET_STEP } from '../constants';

/**
 * Thinking Budget slider control component with model-specific limits
 * 
 * @param {Object} props - Component props
 * @param {number} props.value - Current thinking budget value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.currentModel - Current model ID
 * @returns {JSX.Element} Thinking budget control component
 */
const ThinkingBudgetControl = ({ value, onChange, currentModel }) => {
  const [isSliding, setIsSliding] = useState(false);
  
  // Set max budget and behavior based on current model
  const modelConfig = useMemo(() => {
    // Default configuration
    let config = {
      max: 24576, // Default max for most models
      step: THINKING_BUDGET_STEP
    };
    
    // Model-specific configurations
    if (currentModel) {
      if (currentModel.includes('pro')) {
        // Gemini 2.5 Pro
        config.max = 32768; // Higher max for Pro models
      } else if (currentModel.includes('flash-lite')) {
        // Gemini 2.5 Flash Lite
        config.max = 24576;
        // Flash Lite doesn't support thinking, but keeping the same max
      } else if (currentModel.includes('flash')) {
        // Gemini 2.5 Flash
        config.max = 24576;
      }
    }
    
    return config;
  }, [currentModel]);
  
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
  
  // Calculate tooltip position with boundary protection
  const getTooltipPosition = () => {
    // Calculate raw percentage based on display value
    const percentage = (displayValue / modelConfig.max) * 100;
    
    // Constrain percentage to keep tooltip visible (5% to 95% range)
    const safePercentage = Math.min(Math.max(percentage, 5), 95);
    
    return `${safePercentage}%`;
  };
  
  return (
    <div className="relative">
      <div 
        className={`absolute transform translate-y-[-30px] translate-x-[-50%] px-2 py-1 bg-indigo-600 text-white text-xs rounded transition-opacity ${isSliding ? 'opacity-100' : 'opacity-0'}`} 
        style={{ left: getTooltipPosition() }}
      >
        {value === -1 ? "Dynamic" : `${value} tokens`}
      </div>
      <input
        id="thinkingBudget"
        type="range"
        min={0} // Use 0 as visual minimum, but map to -1 internally
        max={modelConfig.max}
        step={modelConfig.step}
        value={displayValue}
        onMouseDown={() => setIsSliding(true)}
        onMouseUp={() => setIsSliding(false)}
        onTouchStart={() => setIsSliding(true)}
        onTouchEnd={() => setIsSliding(false)}
        onChange={handleChange}
        className="w-full h-2 bg-gray-700 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
      />
    </div>
  );
};

export default ThinkingBudgetControl; 