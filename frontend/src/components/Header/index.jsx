import React, { useState, useEffect } from 'react';
import ModelSelector from '../ModelSelector';
import HeaderButtons from './components/HeaderButtons';
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
 * @param {boolean} props.isAuthenticated - Whether user is authenticated
 * @param {Object} props.userProfile - User profile data
 * @param {Function} props.onSignOut - Sign out handler
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
  isAuthenticated,
  userProfile,
  onSignOut,
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
    <header className="flex items-center justify-between h-14 px-3 sm:px-4 md:px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-20">
      {/* Left side - empty placeholder for layout balance */}
      <div className="w-10"></div>

      {/* Center: Model selector */}
      <div className="flex-grow flex justify-center">
        <ModelSelector
          models={models}
          currentModel={currentModel}
          setCurrentModel={setCurrentModel}
        />
      </div>

      {/* Right side: Action buttons */}
      <HeaderButtons
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        setLiveOpen={setLiveOpen}
        setSettingsOpen={setSettingsOpen}
        isAuthenticated={isAuthenticated}
        userProfile={userProfile}
        onSignOut={onSignOut}
        isMobile={isMobile}
      />
    </header>
  );
} 