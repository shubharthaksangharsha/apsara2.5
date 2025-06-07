import React from 'react';

/**
 * Simple tooltip component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child element that triggers the tooltip
 * @param {string} props.text - Text to display in the tooltip
 * @param {string} props.position - Position of the tooltip (top or right)
 * @returns {JSX.Element} Tooltip component
 */
const Tooltip = ({ children, text, position = 'top' }) => {
  return (
    <div className="relative inline-block">
      {children}
      <div className={`absolute z-50 whitespace-nowrap bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${position === 'right' ? 'left-full ml-2 top-1/2 -translate-y-1/2' : 'bottom-full left-1/2 -translate-x-1/2 mb-1'}`}>
        {text}
      </div>
    </div>
  );
};

export default Tooltip; 