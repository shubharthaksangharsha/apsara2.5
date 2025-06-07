import React from 'react';
import { X, AudioLines } from 'lucide-react';

// Import helper function - this will be defined in MessageHelpers.jsx
const getStatusIndicator = (connectionStatus) => {
  switch (connectionStatus) {
    case 'connecting': return <span className="text-yellow-500 flex items-center gap-1.5"><div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>Connecting...</span>;
    case 'connected': return <span className="text-green-500 flex items-center gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-full"></div>Connected</span>;
    case 'error': return <span className="text-red-500 flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500 rounded-full"></div>Error</span>;
    case 'disconnected': return <span className="text-gray-500 flex items-center gap-1.5"><div className="w-2 h-2 bg-gray-500 rounded-full"></div>Disconnected</span>;
    default: return <span className="text-gray-500">Unknown</span>;
  }
};

/**
 * Header component for the LivePopup
 * Shows title, connection status and close button
 * 
 * @param {Object} props - Component props
 * @param {string} props.connectionStatus - Current connection status
 * @param {Function} props.onClose - Handler for close button
 * @returns {JSX.Element} Header component
 */
const Header = ({ connectionStatus, onClose }) => {
  return (
    <div className="flex justify-between items-center px-3 sm:px-5 py-2.5 sm:py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-md text-sm font-medium text-blue-600 dark:text-blue-300">
          <AudioLines className="h-4 w-4 mr-1.5" />
          <span>Apsara Live</span>
        </div>
        {getStatusIndicator(connectionStatus)}
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={onClose} 
          className="flex items-center text-xs rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Header; 