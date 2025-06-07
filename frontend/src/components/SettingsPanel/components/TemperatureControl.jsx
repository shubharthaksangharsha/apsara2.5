import React from 'react';
import { TEMPERATURE_MIN, TEMPERATURE_MAX, TEMPERATURE_STEP } from '../constants';

/**
 * Temperature slider control component
 * 
 * @param {Object} props - Component props
 * @param {number} props.value - Current temperature value
 * @param {Function} props.onChange - Change handler
 * @returns {JSX.Element} Temperature control component
 */
const TemperatureControl = ({ value, onChange }) => {
  return (
    <div>
      <label htmlFor="temperature" className="block text-xs sm:text-sm font-medium mb-1">
        Temperature: <span className="font-normal text-gray-500 dark:text-gray-400">({value.toFixed(1)})</span>
      </label>
      <input
        id="temperature"
        type="range"
        min={TEMPERATURE_MIN}
        max={TEMPERATURE_MAX}
        step={TEMPERATURE_STEP}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
      />
      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
        Controls randomness (0 = deterministic, 1 = max randomness).
      </p>
    </div>
  );
};

export default TemperatureControl; 