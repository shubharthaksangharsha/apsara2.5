import React from 'react';
import { BrainCircuit } from 'lucide-react'; // Default icon

/**
 * Component for displaying a single prompt suggestion button
 * 
 * @param {Object} props - Component props
 * @param {Object} props.prompt - The prompt data object
 * @param {Function} props.onClick - Handler for when the button is clicked
 * @returns {JSX.Element} PromptButton component
 */
export default function PromptButton({ prompt, onClick }) {
  const Icon = prompt.icon || BrainCircuit;
  
  const handleClick = () => {
    onClick(prompt.text, prompt.modelId, prompt.toolUsage);
  };
  
  return (
    <button
      onClick={handleClick}
      className="flex items-center text-left px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/80 rounded-lg text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-all shadow-sm hover:shadow-lg transform hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-700 group"
    >
      <Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-indigo-500 dark:text-indigo-400 flex-shrink-0 transition-transform group-hover:scale-110" />
      <span className="flex-1 line-clamp-2">{prompt.text.split('\n')[0]}</span>
    </button>
  );
} 