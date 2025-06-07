import React from 'react';
import { DEFAULT_EVENT_FORM } from '../constants';

/**
 * Modal for creating calendar events
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Handler to close the modal
 * @param {Object} props.formData - Form data for the event
 * @param {Function} props.onFormChange - Handler for form field changes
 * @param {Function} props.onSubmit - Handler for form submission
 * @param {boolean} props.isConnected - Whether connection is active
 * @returns {JSX.Element|null} Modal component or null if closed
 */
const CreateEventModal = ({ isOpen, onClose, formData = DEFAULT_EVENT_FORM, onFormChange, onSubmit, isConnected = false }) => {
  if (!isOpen) return null;
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFormChange({ ...formData, [name]: value });
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };
  
  return (
    <div 
      className="absolute inset-0 z-[65] flex justify-center items-center bg-black/40 backdrop-blur-sm p-3 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl w-full max-w-xs sm:max-w-lg overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 sm:mb-5">Create New Calendar Event</h3>
        
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 text-xs sm:text-sm">
          <div>
            <label htmlFor="eventSummary" className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Summary*</label>
            <input
              type="text"
              name="summary"
              id="eventSummary"
              value={formData.summary}
              onChange={handleChange}
              required
              className="w-full p-1.5 sm:p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="eventStartDateTime" className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Start Date & Time*</label>
              <input
                type="datetime-local"
                name="startDateTime"
                id="eventStartDateTime"
                value={formData.startDateTime}
                onChange={handleChange}
                required
                className="w-full p-1.5 sm:p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="eventEndDateTime" className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">End Date & Time*</label>
              <input
                type="datetime-local"
                name="endDateTime"
                id="eventEndDateTime"
                value={formData.endDateTime}
                onChange={handleChange}
                required
                className="w-full p-1.5 sm:p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="eventDescription" className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Description</label>
            <textarea
              name="description"
              id="eventDescription"
              rows="2"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-1.5 sm:p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 custom-scrollbar text-xs sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="eventLocation" className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Location</label>
            <input
              type="text"
              name="location"
              id="eventLocation"
              value={formData.location}
              onChange={handleChange}
              className="w-full p-1.5 sm:p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="eventAttendees" className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Attendees (comma-separated emails)</label>
            <input
              type="text"
              name="attendees"
              id="eventAttendees"
              value={formData.attendees}
              onChange={handleChange}
              className="w-full p-1.5 sm:p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm"
              placeholder="user1@example.com, user2@example.com"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2 sm:pt-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConnected}
              className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal; 