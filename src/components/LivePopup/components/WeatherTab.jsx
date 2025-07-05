import React, { useEffect } from 'react';
import { Sun } from 'lucide-react';

/**
 * WeatherTab component that displays weather information
 * 
 * @param {Object} props - Component props
 * @param {Object} props.weatherUIData - Weather data to display
 * @returns {JSX.Element} WeatherTab component
 */
const WeatherTab = ({ weatherUIData }) => {
  // Log data when the weather tab renders
  useEffect(() => {
    console.log("[LivePopup] Rendering Weather tab. Current weatherUIData:", weatherUIData);
  }, [weatherUIData]);
  
  return (
    <div className="p-2 sm:p-4 space-y-3 text-gray-800 dark:text-gray-200">
      {weatherUIData && Object.keys(weatherUIData).length > 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-3 sm:mb-4">
            <div className="text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold">{weatherUIData.city}, {weatherUIData.country}</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{weatherUIData.condition_description}</p>
            </div>
            {weatherUIData.icon && (
              <img 
                src={`https://openweathermap.org/img/wn/${weatherUIData.icon}@2x.png`} 
                alt={weatherUIData.condition_description}
                className="w-12 h-12 sm:w-16 sm:h-16 mt-2 sm:mt-0"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm">
            <div>
              <p className="font-semibold text-base sm:text-lg">{weatherUIData.temp_numeric?.toFixed(1)}{weatherUIData.temp_unit_char}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Temperature</p>
            </div>
            <div>
              <p className="font-semibold text-base sm:text-lg">{weatherUIData.humidity_percent}%</p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Humidity</p>
            </div>
            <div>
              <p className="font-semibold text-base sm:text-lg">{weatherUIData.wind_speed_numeric?.toFixed(1)} {weatherUIData.wind_speed_unit_text}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Wind</p>
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 text-center">Weather data from OpenWeatherMap</p>
        </div>
      ) : (
        <div className="text-center text-gray-500 dark:text-gray-400 p-6 flex flex-col items-center justify-center h-full bg-white dark:bg-gray-800 rounded-lg shadow">
          <Sun size={40} className="mb-3 text-gray-400 dark:text-gray-500"/>
          <p className="font-semibold mb-1">Weather Information</p>
          <p className="text-xs">Ask Apsara about the weather for a specific city to see details here.</p>
        </div>
      )}
    </div>
  );
};

export default WeatherTab; 