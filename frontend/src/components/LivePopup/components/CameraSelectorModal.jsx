import React from 'react';

/**
 * Modal for selecting camera devices
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Handler to close the modal
 * @param {Array} props.videoDevices - List of available video devices
 * @param {Function} props.onSelectDevice - Handler when a device is selected
 * @returns {JSX.Element|null} Modal component or null if closed
 */
const CameraSelectorModal = ({ isOpen, onClose, videoDevices, onSelectDevice }) => {
  if (!isOpen) return null;
  
  return (
    <div 
      className="absolute inset-0 z-60 flex justify-center items-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl w-full max-w-xs sm:max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 sm:mb-4">Select Camera Source</h3>
        
        {videoDevices.length > 0 ? (
          <ul className="space-y-1.5 sm:space-y-2">
            {videoDevices.map(device => (
              <li key={device.deviceId}>
                <button
                  onClick={() => onSelectDevice(device.deviceId)}
                  className="w-full text-left px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No camera devices found.</p>
        )}
        
        <button
          onClick={onClose}
          className="mt-4 sm:mt-6 w-full px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CameraSelectorModal; 