import React from 'react';

/**
 * Dialog for saving the current session
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {Function} props.onClose - Handler to close the dialog
 * @param {string} props.sessionTitle - Current session title input value
 * @param {Function} props.onSessionTitleChange - Handler for session title changes
 * @param {Function} props.onSave - Handler for saving the session
 * @returns {JSX.Element|null} Dialog component or null if closed
 */
const SaveSessionDialog = ({ isOpen, onClose, sessionTitle, onSessionTitleChange, onSave }) => {
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
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 sm:mb-4">Save Current Session</h3>
        
        <div className="mb-4">
          <label htmlFor="sessionTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Session Title
          </label>
          <input
            type="text"
            id="sessionTitle"
            value={sessionTitle}
            onChange={e => onSessionTitleChange(e.target.value)}
            placeholder="My Chat Session"
            className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 text-sm"
          />
        </div>
        
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveSessionDialog; 