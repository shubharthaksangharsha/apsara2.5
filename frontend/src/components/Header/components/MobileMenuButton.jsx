import React from 'react';
import { Menu } from 'lucide-react';

/**
 * Mobile menu button that displays a hamburger icon to toggle the sidebar
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onClick - Handler for sidebar toggle
 * @returns {JSX.Element} Mobile menu button component
 */
const MobileMenuButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="block lg:hidden p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all duration-150 ease-in-out"
      aria-label="Toggle sidebar"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
};

export default MobileMenuButton; 