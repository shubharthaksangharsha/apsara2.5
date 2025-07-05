import React from 'react';
import { Menu } from 'lucide-react';
import { ANIMATION_DURATION } from '../constants';

/**
 * Sidebar header component with title and hamburger button
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.sidebarLocked - Whether sidebar is locked in expanded state
 * @param {Function} props.onHandleSidebarHamburgerClick - Handler for hamburger button click
 * @returns {JSX.Element} Sidebar header component
 */
const SidebarHeader = ({ sidebarLocked, onHandleSidebarHamburgerClick }) => {
  return (
    <>
      {/* Sidebar Hamburger/Lock Button */}
      <div className="hidden lg:flex flex-shrink-0 px-3 pt-3 pb-2">
        <button
          onClick={onHandleSidebarHamburgerClick}
          className={`p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all duration-150 ease-in-out ${sidebarLocked ? 'bg-indigo-100 dark:bg-indigo-900/30' : ''}`}
          aria-label={sidebarLocked ? "Unlock Sidebar" : "Lock Sidebar"}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Animated App Title */}
      <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0 overflow-hidden">
        <span
          className={`
            text-lg font-semibold whitespace-nowrap animate-shimmer transition-opacity duration-300
            ${sidebarLocked ? 'lg:opacity-100' : 'lg:opacity-0 group-hover:lg:opacity-100'}
          `}
          style={{ animationDuration: ANIMATION_DURATION }}
        >
          Apsara 2.5
        </span>
      </div>
    </>
  );
};

export default SidebarHeader; 