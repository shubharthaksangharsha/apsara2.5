import React from 'react';
import { CalendarIcon, CalendarDays, PlusCircle, RefreshCw, Clock } from 'lucide-react';

/**
 * CalendarTab component for displaying and managing calendar events
 * 
 * @param {Object} props - Component props
 * @param {Array} props.calendarEvents - List of calendar events
 * @param {string} props.connectionStatus - Current connection status
 * @param {Function} props.onRefreshCalendar - Handler for refreshing calendar
 * @param {Function} props.setIsCreateEventModalOpen - Function to open the create event modal
 * @returns {JSX.Element} CalendarTab component
 */
const CalendarTab = ({
  calendarEvents,
  connectionStatus,
  onRefreshCalendar,
  setIsCreateEventModalOpen
}) => {
  return (
    <div className="p-2 sm:p-4 space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-1.5 sm:gap-2">
          <CalendarIcon size={20} className="text-indigo-500 dark:text-indigo-400"/>
          Calendar Events
        </h2>
        <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsCreateEventModalOpen(true)}
            disabled={connectionStatus !== 'connected'}
            className="flex-1 sm:flex-auto items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-green-500 text-white text-[11px] sm:text-xs font-medium rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 flex"
          >
            <PlusCircle size={12} />
            Create Event
          </button>
          <button
            onClick={onRefreshCalendar}
            disabled={connectionStatus !== 'connected'}
            className="flex-1 sm:flex-auto items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-indigo-500 text-white text-[11px] sm:text-xs font-medium rounded-md hover:bg-indigo-600 transition-colors disabled:opacity-50 flex"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {connectionStatus !== 'connected' && (
        <div className="text-center text-gray-500 dark:text-gray-400 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <CalendarDays size={32} className="mb-2 sm:mb-3 text-gray-400 dark:text-gray-500 mx-auto"/>
          <p className="font-semibold mb-1 text-sm sm:text-base">Calendar Disconnected</p>
          <p className="text-xs sm:text-sm">Start a session to load and manage calendar events.</p>
        </div>
      )}

      {connectionStatus === 'connected' && calendarEvents.length > 0 && (
        <ul className="space-y-1.5 sm:space-y-2">
          {calendarEvents.map(event => (
            <li key={event.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
              <h3 className="font-semibold text-indigo-700 dark:text-indigo-300">{event.summary}</h3>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}
              </p>
              {event.location && <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Location: {event.location}</p>}
              {event.description && <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">{event.description}</p>}
              {event.link && <a href={event.link} target="_blank" rel="noopener noreferrer" className="text-[10px] sm:text-xs text-blue-500 hover:underline dark:text-blue-400 mt-1 block">View on Google Calendar</a>}
            </li>
          ))}
        </ul>
      )}

      {connectionStatus === 'connected' && calendarEvents.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <CalendarDays size={40} className="mb-3 text-gray-400 dark:text-gray-500 mx-auto"/>
          <p className="font-semibold mb-1">No Events Found</p>
          <p className="text-xs">Click "Refresh Events" to load your upcoming calendar entries, or there might be no events in the default range.</p>
        </div>
      )}
    </div>
  );
};

export default CalendarTab; 