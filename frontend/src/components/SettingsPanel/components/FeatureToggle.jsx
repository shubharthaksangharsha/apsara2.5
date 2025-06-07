import React from 'react';
import { Switch } from '@headlessui/react';

/**
 * Feature toggle switch component
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Toggle label
 * @param {string} props.description - Toggle description
 * @param {boolean} props.checked - Whether toggle is checked
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.disabled - Whether toggle is disabled
 * @param {React.ReactNode} props.icon - Optional icon to display
 * @returns {JSX.Element} Feature toggle component
 */
const FeatureToggle = ({ 
  label, 
  description, 
  checked, 
  onChange, 
  disabled = false,
  icon = null
}) => {
  return (
    <Switch.Group as="div" className="flex items-center justify-between py-2 sm:py-3">
      <span className="flex flex-grow flex-col mr-3">
        <Switch.Label
          as="span"
          className={`text-xs sm:text-sm font-medium leading-6 text-gray-900 dark:text-gray-100 ${disabled ? 'opacity-50' : ''}`}
          passive
        >
          {label}
        </Switch.Label>
        <Switch.Description 
          as="span" 
          className={`text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 ${disabled ? 'opacity-50' : ''}`}
        >
          {description}
        </Switch.Description>
      </span>
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        } ${checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
      >
        {icon && (
          <span className="absolute inset-0 h-full w-full flex items-center justify-center transition-opacity">
            {icon}
          </span>
        )}
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white dark:bg-gray-300 shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'
          }`}
        />
      </Switch>
    </Switch.Group>
  );
};

export default FeatureToggle; 