import React from 'react';
import { Wrench, CheckCircle } from 'lucide-react';

/**
 * Component to display function call status and results
 * 
 * @param {Object} props - Component props
 * @param {string} props.functionName - Name of the function being called
 * @param {string} props.status - Status of the function call ('executing' or 'completed')
 * @param {Object} props.result - Result of the function call (if completed)
 * @returns {JSX.Element} FunctionCallStatus component
 */
const FunctionCallStatus = ({ functionName, status, result }) => {
  const isExecuting = status === 'executing';
  
  // Format result for display
  const getFormattedResult = () => {
    if (!result) return '';
    
    // Check for common result patterns
    if (result.status) return result.status;
    if (result.message) return result.message;
    
    // Handle specific function types
    if (functionName === 'getBatteryStatus' && result.levelPercent) {
      return `Your battery is currently at ${result.levelPercent}%${result.isCharging ? ' and it\'s charging' : ''}`;
    }
    
    if (functionName === 'getWeather' && result.current) {
      return `${result.current.temp_c}°C, ${result.current.condition.text} in ${result.location.name}`;
    }
    
    if (functionName === 'googleSearch') {
      return 'Search results retrieved';
    }
    
    if (functionName === 'urlContext') {
      return 'URL content retrieved';
    }
    
    // For other functions, try to create a reasonable string representation
    const resultStr = JSON.stringify(result)
      .replace(/[{}"]/g, '')
      .replace(/,/g, ', ')
      .replace(/:/g, ': ');
    
    return resultStr.length > 100 ? resultStr.substring(0, 97) + '...' : resultStr;
  };
  
  return (
    <div className={`my-2 p-3 rounded-lg flex items-center gap-3 ${
      isExecuting 
        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800' 
        : 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
    }`}>
      {isExecuting ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
          <div className="flex-1">
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              🔧 Calling function: {functionName}
            </p>
          </div>
        </>
      ) : (
        <>
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div className="flex-1">
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
              ✅ {functionName} completed
            </p>
            {result && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {getFormattedResult()}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FunctionCallStatus; 