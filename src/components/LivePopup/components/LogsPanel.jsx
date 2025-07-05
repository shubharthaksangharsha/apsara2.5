import React from 'react';
import { LOGGABLE_KEYWORDS } from '../constants';

/**
 * LogsPanel component that shows system event logs
 * Filters messages to only show relevant system information
 * 
 * @param {Object} props - Component props
 * @param {Array} props.messages - All messages in the session
 * @returns {JSX.Element} LogsPanel component
 */
const LogsPanel = ({ messages }) => {
  // Filter out messages that are not relevant for logging
  const logMessages = messages.filter(msg => {
    if (msg.role === 'system') {
      // Include specific system messages based on keywords or patterns
      return LOGGABLE_KEYWORDS.some(keyword => msg.text?.includes(keyword));
    }
    return false;
  });

  return (
    <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-800/50 p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0 hidden md:flex flex-col">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 border-b pb-1.5 dark:border-gray-600">Event Logs</h3>
      <div className="text-xs text-gray-600 dark:text-gray-400 flex-grow overflow-y-auto custom-scrollbar space-y-1 pr-1">
        {logMessages.length > 0 ? logMessages.map(msg => (
          <div key={msg.id + '-log'} className="p-1.5 rounded bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 text-[11px] leading-snug break-words">
            {msg.text}
          </div>
        )) : <p className="text-center mt-4">No log events.</p>}
      </div>
    </div>
  );
};

export default LogsPanel; 