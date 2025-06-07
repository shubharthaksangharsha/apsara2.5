import React from 'react';

/**
 * Component that displays detailed information about a model in a tooltip
 * 
 * @param {Object} props - Component props
 * @param {Object} props.model - The model to display information for
 * @param {Object} props.position - Position coordinates for the tooltip
 * @param {Function} props.onClose - Function to close the tooltip
 * @returns {JSX.Element|null} ModelTooltip component or null if no model
 */
export default function ModelTooltip({ model, position, onClose }) {
  if (!model) return null;

  return (
    <div 
      className="fixed z-50 bg-white dark:bg-gray-800 shadow-xl rounded-md p-4 border border-gray-200 dark:border-gray-700 w-64"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        animation: 'fadeIn 0.2s ease-in-out'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="absolute right-2 top-2 cursor-pointer text-gray-400 hover:text-gray-600"
        onClick={onClose}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
      
      <div className="font-medium mb-1">{model.name}</div>
      <div className="text-xs mb-2">{model.description}</div>
      <div className="text-xs">
        {model.features && model.features.map((feature, index) => (
          <div key={index} className="flex items-baseline mb-1 last:mb-0">
            <span className="mr-1">•</span>
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
} 