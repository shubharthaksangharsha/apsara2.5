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
    <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
      {/* User Profile - Only visible when authenticated */}
      {isAuthenticated && (
        <div className="flex-shrink-0 flex items-center">
          {/* Profile Picture - Smaller on mobile */}
          <div className="relative flex-shrink-0">
            {userProfile?.picture ? (
              <ProfileImage 
                profilePicture={userProfile.picture}
                userName={userProfile.name || 'User'}
                isMobile={isMobile}
              />
            ) : (
              <div 
                className={`rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-semibold border-2 border-indigo-500 dark:border-indigo-500 shadow-lg ${
                  isMobile ? 'h-7 w-7 text-xs' : 'h-8 w-8 sm:h-9 sm:w-9 text-base'
                }`}
              >
                {userProfile?.name?.charAt(0) || 'U'}
              </div>
            )}
            
            {/* Status Indicator - Smaller on mobile */}
            <div className={`absolute bottom-0 right-0 rounded-full bg-green-500 dark:bg-green-400 border-2 border-white dark:border-gray-800 animate-pulse ${
              isMobile ? 'w-2 h-2' : 'w-3 h-3'
            }`}></div>
          </div>
          
          {/* User Name - Hidden on mobile to save space */}
          {!isMobile && (
            <div className="hidden md:flex items-center ml-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full px-2 py-1 text-xs">
              <span className="truncate max-w-[100px]">{userProfile?.name?.split(' ')[0] || 'User'}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Theme Toggle - Smaller on mobile */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all duration-150 ease-in-out group ${
          isMobile ? 'p-1' : 'p-1.5 sm:p-2'
        }`}
        title="Toggle Theme"
      >
        {darkMode ? 
          <Sun className={`transition-transform duration-150 ease-in-out group-hover:scale-110 group-hover:rotate-180 ${isMobile ? 'h-4 w-4' : 'h-4 w-4 sm:h-5 sm:w-5'}`} /> : 
          <Moon className={`transition-transform duration-150 ease-in-out group-hover:scale-110 group-hover:-rotate-12 ${isMobile ? 'h-4 w-4' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />
        }
      </button>

      {/* Live Button - Smaller on mobile */}
      <button
        onClick={() => setLiveOpen(true)}
        className={`rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400 transition-all duration-150 ease-in-out group ${
          isMobile ? 'p-1' : 'p-1.5 sm:p-2'
        }`}
        title="Start Live Session"
      >
        <MessageSquare className={`transition-transform duration-150 ease-in-out group-hover:scale-110 ${isMobile ? 'h-4 w-4' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />
      </button>

      {/* Settings Button - Smaller on mobile */}
      <button
        onClick={() => setSettingsOpen(true)}
        className={`rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-150 ease-in-out group ${
          isMobile ? 'p-1' : 'p-1.5 sm:p-2'
        }`}
        title="Chat Settings"
      >
        <Settings className={`transition-transform duration-150 ease-in-out group-hover:scale-110 group-hover:rotate-45 ${isMobile ? 'h-4 w-4' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />
      </button>

      {/* Cache Manager Button - Smaller on mobile */}
      <button
        onClick={() => setCacheManagerOpen(true)}
        className={`rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-150 ease-in-out group ${
          isMobile ? 'p-1' : 'p-1.5 sm:p-2'
        }`}
        title="Cache Management"
      >
        <Database className={`transition-transform duration-150 ease-in-out group-hover:scale-110 ${isMobile ? 'h-4 w-4' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />
      </button>
      
      {/* Sign Out Button - Smaller on mobile */}
      {isAuthenticated && (
        <button
          onClick={onSignOut}
          className={`rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150 ease-in-out group ${
            isMobile ? 'p-1' : 'p-1.5 sm:p-2'
          }`}
          title="Sign Out"
        >
          <LogOut className={`transition-transform duration-150 ease-in-out group-hover:scale-110 ${isMobile ? 'h-4 w-4' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />
        </button>
      )}
    </div>
  );
};

export default HeaderButtons; 