import React from 'react';
import { Trash2 } from 'lucide-react';
import { SESSION_ITEM_CLASS, TITLE_CLASS, DATE_CLASS } from '../constants';

/**
 * Component for displaying a single saved session item
 * 
 * @param {Object} props - Component props
 * @param {Object} props.session - The session data object
 * @param {Function} props.onClick - Handler for when the session is clicked
 * @param {Function} props.onDelete - Handler for when the delete button is clicked
 * @returns {JSX.Element} SessionItem component
 */
export default function SessionItem({ session, onClick, onDelete }) {
  const handleClick = () => {
    onClick(session);
  };
  
  const handleDelete = (e) => {
    e.stopPropagation(); // Prevent triggering onClick
    onDelete(session.id);
  };
  
  // Format the date
  const formattedDate = new Date(session.timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <div 
      className={SESSION_ITEM_CLASS}
      onClick={handleClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 pr-2">
          <h4 className={TITLE_CLASS}>{session.title}</h4>
          <p className={DATE_CLASS}>{formattedDate}</p>
        </div>
        
        <button
          onClick={handleDelete}
          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Delete session"
          aria-label="Delete session"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
} 