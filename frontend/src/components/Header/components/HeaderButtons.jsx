import React from 'react';
import { Sun, Moon, MessageSquare, Settings, LogOut, Database } from 'lucide-react';
import ProfileImage from './ProfileImage';

/**
 * Header action buttons component
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.darkMode - Current theme mode
 * @param {Function} props.setDarkMode - Function to toggle dark mode
 * @param {Function} props.setLiveOpen - Function to open live session modal
 * @param {Function} props.setSettingsOpen - Function to open settings panel
 * @param {Function} props.setCacheManagerOpen - Function to open cache manager
 * @param {boolean} props.isAuthenticated - Whether user is authenticated
 * @param {Object} props.userProfile - User profile data
 * @param {Function} props.onSignOut - Sign out handler
 * @param {boolean} props.isMobile - Whether viewport is mobile size
 * @returns {JSX.Element} Header buttons component
 */
const HeaderButtons = ({ 
  darkMode, 
  setDarkMode, 
  setLiveOpen, 
  setSettingsOpen, 
  setCacheManagerOpen,
  isAuthenticated, 
  userProfile, 
  onSignOut, 
  isMobile 
}) => {
  return (
    <div className="flex items-center gap-2 sm:gap-3 md:space-x-3">
      {/* User Profile - Only visible when authenticated */}
      {isAuthenticated && (
        <div className="flex-shrink-0 flex items-center ml-auto mr-2">
          {/* Profile Picture - Fixed position with absolute sizing for all devices */}
          <div className="relative flex-shrink-0">
            {userProfile?.picture ? (
              <ProfileImage 
                profilePicture={userProfile.picture}
                userName={userProfile.name || 'User'}
              />
            ) : (
              <div 
                className="h-8 w-8 sm:h-9 sm:w-9 md:h-9 md:w-9 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-base text-indigo-700 dark:text-indigo-300 font-semibold border-2 border-indigo-500 dark:border-indigo-500 shadow-lg"
                style={{ minWidth: '32px' }} /* Force minimum width */
              >
                {userProfile?.name?.charAt(0) || 'U'}
              </div>
            )}
            
            {/* Status Indicator - Small dot in the corner with pulse animation */}
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 dark:bg-green-400 border-2 border-white dark:border-gray-800 animate-pulse"></div>
          </div>
          
          {/* User Name with responsive display */}
          {!isMobile && (
            <div className="hidden md:flex items-center ml-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full px-2 py-1 text-xs">
              <span className="truncate max-w-[100px]">{userProfile?.name?.split(' ')[0] || 'User'}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Theme Toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="p-1.5 sm:p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all duration-150 ease-in-out group"
        title="Toggle Theme"
      >
        {darkMode ? <Sun className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-150 ease-in-out group-hover:scale-110 group-hover:rotate-180" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-150 ease-in-out group-hover:scale-110 group-hover:-rotate-12" />}
      </button>

      {/* Live Button */}
      <button
        onClick={() => setLiveOpen(true)}
        className="p-1.5 sm:p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400 transition-all duration-150 ease-in-out group"
        title="Start Live Session"
      >
        <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
      </button>

      {/* Settings Button */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="p-1.5 sm:p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-150 ease-in-out group"
        title="Chat Settings"
      >
        <Settings className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-150 ease-in-out group-hover:scale-110 group-hover:rotate-45" />
      </button>

      {/* Cache Manager Button */}
      <button
        onClick={() => setCacheManagerOpen(true)}
        className="p-1.5 sm:p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-150 ease-in-out group"
        title="Cache Management"
      >
        <Database className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
      </button>
      
      {/* Sign Out Button - Only visible when authenticated */}
      {isAuthenticated && (
        <button
          onClick={onSignOut}
          className="p-1.5 sm:p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150 ease-in-out group"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
        </button>
      )}
    </div>
  );
};

export default HeaderButtons; 