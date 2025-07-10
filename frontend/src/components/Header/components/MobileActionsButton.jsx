import React, { useState } from 'react';
import { MoreVertical, Sun, Moon, AudioLines, Settings, Database, LogOut, X } from 'lucide-react';
import ProfileImage from './ProfileImage';

/**
 * Mobile actions button that opens a drawer with all header actions
 * Only visible on mobile devices (hidden on desktop)
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
 * @returns {JSX.Element} Mobile actions button component
 */
const MobileActionsButton = ({ 
  darkMode, 
  setDarkMode, 
  setLiveOpen, 
  setSettingsOpen, 
  setCacheManagerOpen,
  isAuthenticated, 
  userProfile, 
  onSignOut 
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleActionClick = (action) => {
    // Close drawer after action
    setIsDrawerOpen(false);
    // Execute the action
    action();
  };

  return (
    <>
      {/* Mobile Actions Trigger Button - Only visible on mobile */}
      <button
        onClick={() => setIsDrawerOpen(true)}
        className="block lg:hidden p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all duration-150 ease-in-out"
        aria-label="Open actions menu"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />
          
          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-800 shadow-xl transform transition-transform">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Actions
              </h3>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex flex-col p-4 space-y-4">
              {/* User Profile Section */}
              {isAuthenticated && userProfile && (
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="relative flex-shrink-0 mr-3">
                    {userProfile.picture ? (
                      <ProfileImage 
                        profilePicture={userProfile.picture}
                        userName={userProfile.name || 'User'}
                        isMobile={true}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-semibold border-2 border-indigo-500 dark:border-indigo-500">
                        {userProfile.name?.charAt(0) || 'U'}
                      </div>
                    )}
                    
                    {/* Status Indicator */}
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 dark:bg-green-400 border-2 border-white dark:border-gray-700 animate-pulse"></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {userProfile.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {userProfile.email}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                {/* Theme Toggle */}
                <button
                  onClick={() => handleActionClick(() => setDarkMode(!darkMode))}
                  className="w-full flex items-center p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150 text-left"
                >
                  {darkMode ? (
                    <Sun className="h-5 w-5 mr-3 text-yellow-500" />
                  ) : (
                    <Moon className="h-5 w-5 mr-3 text-blue-500" />
                  )}
                  <span className="font-medium">
                    {darkMode ? 'Light Mode' : 'Dark Mode'}
                  </span>
                </button>

                {/* Live Session */}
                <button
                  onClick={() => handleActionClick(() => setLiveOpen(true))}
                  className="w-full flex items-center p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150 text-left"
                >
                  <AudioLines className="h-5 w-5 mr-3 text-green-500" />
                  <span className="font-medium">Start Live Session</span>
                </button>

                {/* Settings */}
                <button
                  onClick={() => handleActionClick(() => setSettingsOpen(true))}
                  className="w-full flex items-center p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150 text-left"
                >
                  <Settings className="h-5 w-5 mr-3 text-blue-500" />
                  <span className="font-medium">Chat Settings</span>
                </button>

                {/* Cache Manager */}
                <button
                  onClick={() => handleActionClick(() => setCacheManagerOpen(true))}
                  className="w-full flex items-center p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150 text-left"
                >
                  <Database className="h-5 w-5 mr-3 text-purple-500" />
                  <span className="font-medium">Cache Management</span>
                </button>

                {/* Sign Out */}
                {isAuthenticated && (
                  <button
                    onClick={() => handleActionClick(onSignOut)}
                    className="w-full flex items-center p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150 text-left"
                  >
                    <LogOut className="h-5 w-5 mr-3 text-red-500" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileActionsButton;
