import React, { useState, useEffect } from 'react';
import ModelSelector from './components/ModelSelector';
import HeaderButtons from './components/HeaderButtons';
import MobileMenuButton from './components/MobileMenuButton';
import MobileActionsButton from './components/MobileActionsButton';
import { MOBILE_BREAKPOINT } from './constants';

/**
 * Header component for the application
 * 
 * @param {Object} props - Component props
 * @param {Array} props.models - List of available models
 * @param {string} props.currentModel - Currently selected model ID
 * @param {Function} props.setCurrentModel - Function to update the selected model
 * @param {boolean} props.darkMode - Current theme mode
 * @param {Function} props.setDarkMode - Function to toggle dark mode
 * @param {Function} props.setLiveOpen - Function to open live session modal
 * @param {Function} props.setSettingsOpen - Function to open settings panel
 * @param {Function} props.setCacheManagerOpen - Function to open cache manager
 * @param {boolean} props.isAuthenticated - Whether user is authenticated
 * @param {Object} props.userProfile - User profile data
 * @param {Function} props.onSignOut - Sign out handler
 * @param {Function} props.onToggleSidebar - Function to toggle sidebar visibility
 * @returns {JSX.Element} Header component
 */
export default function Header({
  models,
  currentModel,
  setCurrentModel,
  darkMode,
  setDarkMode,
  setLiveOpen,
  setSettingsOpen,
  setCacheManagerOpen,
  isAuthenticated,
  userProfile,
  onSignOut,
  onToggleSidebar,
}) {
  // Track if we're on mobile for responsive design
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);

  // Update mobile state on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header className="flex items-center justify-between h-14 px-2 sm:px-4 md:px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-20">
      {/* Left side - Mobile menu button */}
      <div className="flex-shrink-0 w-10">
        <MobileMenuButton 
          onClick={onToggleSidebar}
        />
      </div>

      {/* Center: Model selector - More compact on mobile */}
      <div className="flex-1 flex justify-center px-2 min-w-0">
        <ModelSelector
          models={models}
          currentModel={currentModel}
          setCurrentModel={setCurrentModel}
          isMobile={isMobile}
        />
      </div>

      {/* Right side: Action buttons - Hidden on mobile, visible on desktop */}
      <div className="flex-shrink-0">
        <div className="hidden lg:block">
          <HeaderButtons
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            setLiveOpen={setLiveOpen}
            setSettingsOpen={setSettingsOpen}
            setCacheManagerOpen={setCacheManagerOpen}
            isAuthenticated={isAuthenticated}
            userProfile={userProfile}
            onSignOut={onSignOut}
            isMobile={isMobile}
          />
        </div>
        {/* Mobile actions button - Only visible on mobile */}
        <div className="lg:hidden w-10">
          <MobileActionsButton
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            setLiveOpen={setLiveOpen}
            setSettingsOpen={setSettingsOpen}
            setCacheManagerOpen={setCacheManagerOpen}
            isAuthenticated={isAuthenticated}
            userProfile={userProfile}
            onSignOut={onSignOut}
          />
        </div>
      </div>
    </header>
  );
} 