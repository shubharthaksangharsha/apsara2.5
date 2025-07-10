import React, { useState, useMemo } from 'react';
import { MAX_OUTPUT_TOKENS_STEP } from '../constants';

/**
 * Max Output Tokens slider control component with model-specific limits
 * 
 * @param {Object} props - Component props
 * @param {number} props.value - Current max output tokens value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.currentModel - Current model ID
 * @returns {JSX.Element} Max output tokens control component
 */
const MaxOutputTokensControl = ({ value, onChange, currentModel }) => {
  const [isSliding, setIsSliding] = useState(false);
  
  // Set max tokens based on current model
  const modelConfig = useMemo(() => {
    // Default configuration for most models
    let config = {
      min: 1,
      max: 8192, // Default for Gemini 2.0 models
      step: MAX_OUTPUT_TOKENS_STEP
    };
    
    // Model-specific configurations
    if (currentModel) {
      if (currentModel.includes('2.5-pro') || currentModel.includes('2.5-flash')) {
        // Gemini 2.5 Pro and Flash both support higher token limits
        config.max = 65536;
      } else if (currentModel.includes('2.0-flash')) {
        // Gemini 2.0 Flash
        config.max = 8192;
      }
    }
    
    return config;
  }, [currentModel]);
  
  // Calculate tooltip position with boundary protection
  const getTooltipPosition = () => {
    // Calculate raw percentage
    const percentage = ((value - modelConfig.min) / (modelConfig.max - modelConfig.min)) * 100;
    
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
        {value} tokens
      </div>
      <input
        id="maxOutputTokens"
        type="range"
        min={modelConfig.min}
        max={modelConfig.max}
        step={modelConfig.step}
        value={value}
        onMouseDown={() => setIsSliding(true)}
        onMouseUp={() => setIsSliding(false)}
        onTouchStart={() => setIsSliding(true)}
        onTouchEnd={() => setIsSliding(false)}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-2 bg-gray-700 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
      />
    </div>
  );
};

export default MaxOutputTokensControl; 