import React, { Fragment, useEffect, useState } from 'react';

// Profile Image Component that uses initials to avoid Google rate limiting
const ProfileImage = ({ profilePicture, userName }) => {
  // Always use initials avatar to avoid Google rate limiting issues
  return (
    <div 
      className="h-8 w-8 sm:h-9 sm:w-9 md:h-9 md:w-9 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-base text-indigo-700 dark:text-indigo-300 font-semibold border-2 border-indigo-500 dark:border-indigo-500 shadow-lg"
      style={{ minWidth: '32px' }}
      title={userName}
    >
      {userName?.charAt(0) || 'U'}
    </div>
  );
};
import { Menu, Sun, Moon, MessageSquare, Settings, Check, ChevronsUpDown, LogOut, Mail } from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';

export default function Header({ 
    models, 
    currentModel, 
    setCurrentModel, 
    darkMode, 
    setDarkMode, 
    setLiveOpen, 
    setSettingsOpen, 
    setIsSidebarOpen,
    isAuthenticated,
    userProfile,
    onSignOut
}) {
  // State to track if we're on mobile
  const [isMobile, setIsMobile] = useState(false);
  
  // Effect to detect mobile devices
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check on mount and on resize
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  const selectedModelObject = models.find(m => m.id === currentModel);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-20 py-2 px-3 sm:px-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700/50">
      <div className="flex items-center justify-between flex-nowrap">
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsSidebarOpen(true)} 
          className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-500 dark:hover:text-indigo-400 lg:hidden" 
          aria-label="Open Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        {/* Model Select - Improved for mobile with reduced padding */}
        <div className="flex items-center flex-shrink min-w-0 lg:ml-0 ml-2">
          <Listbox value={currentModel} onChange={setCurrentModel}>
            <div className="relative w-auto min-w-[180px] max-w-[220px] sm:min-w-[240px] sm:max-w-[280px]">
              <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-gray-100 dark:bg-gray-700/50 py-1.5 sm:py-2 pl-2 sm:pl-3 pr-8 sm:pr-10 text-left shadow-md hover:bg-gray-200 dark:hover:bg-gray-600/60 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 text-xs sm:text-sm transition-colors">
                <span className="block truncate text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedModelObject?.name || 'Select Model'}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1 sm:pr-2">
                  <ChevronsUpDown
                    className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500"
                    aria-hidden="true"
                  />
                </span>
              </Listbox.Button>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
                enter="transition ease-out duration-150"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
              >
                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none text-xs sm:text-sm z-30">
                  {models.map((model) => (
                    <Listbox.Option
                      key={model.id}
                      className={({ active }) =>
                        `relative cursor-default select-none py-1.5 sm:py-2 pl-8 sm:pl-10 pr-3 sm:pr-4 ${
                          active ? 'bg-indigo-100 dark:bg-indigo-600 text-indigo-900 dark:text-white' : 'text-gray-900 dark:text-gray-200'
                        }`
                      }
                      value={model.id}
                      title={model.name}
                    >
                      {({ selected }) => (
                        <>
                          <span
                            className={`block truncate ${
                              selected ? 'font-medium text-indigo-700 dark:text-indigo-200' : 'font-normal'
                            }`}
                          >
                            {model.name}
                          </span>
                          {selected ? (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2 sm:pl-3 text-indigo-600 dark:text-indigo-300">
                              <Check className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
        </div>
        
        {/* Header Buttons */}
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
      </div>
    </header>
  );
}