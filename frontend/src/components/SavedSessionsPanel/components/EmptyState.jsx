import React from 'react';
import { BookX } from 'lucide-react';
import { EMPTY_STATE_CLASS, EMPTY_STATE_TEXT } from '../constants';

/**
 * Component displayed when there are no saved sessions
 * 
 * @returns {JSX.Element} EmptyState component
 */
export default function EmptyState() {
  return (
    <div className={EMPTY_STATE_CLASS}>
      <div className="flex flex-col items-center">
        <BookX className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
        <p>{EMPTY_STATE_TEXT}</p>
      </div>
    </div>
  );
} 