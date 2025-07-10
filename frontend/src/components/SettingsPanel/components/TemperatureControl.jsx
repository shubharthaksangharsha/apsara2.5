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
      <input
        id="temperature"
        type="range"
        min={TEMPERATURE_MIN}
        max={TEMPERATURE_MAX}
        step={TEMPERATURE_STEP}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
      />
    </div>
  );
};

export default TemperatureControl; 