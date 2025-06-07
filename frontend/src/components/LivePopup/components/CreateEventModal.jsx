import React from 'react';

/**
 * Modal for creating a new calendar event
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Object} props.formData - Form data for the event
 * @param {Function} props.onFormChange - Handler for form changes
 * @param {Function} props.onClose - Handler for modal close
 * @param {Function} props.onSubmit - Handler for form submission
 * @returns {JSX.Element|null} CreateEventModal component
 */
const CreateEventModal = ({ isOpen, formData, onFormChange, onClose, onSubmit }) => {
  if (!isOpen) return null;
  
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
              onChange={onFormChange}
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
                onChange={onFormChange}
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
                onChange={onFormChange}
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
              value={formData.description}
              onChange={onFormChange}
              rows={3}
              className="w-full p-1.5 sm:p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm"
            ></textarea>
          </div>
          <div>
            <label htmlFor="eventLocation" className="block text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Location</label>
            <input
              type="text"
              name="location"
              id="eventLocation"
              value={formData.location}
              onChange={onFormChange}
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
              onChange={onFormChange}
              placeholder="john@example.com, jane@example.com"
              className="w-full p-1.5 sm:p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
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