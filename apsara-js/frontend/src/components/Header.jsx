import React from 'react';
import { Menu, Sun, Moon, MessageSquare, Settings } from 'lucide-react';

export default function Header({ 
    models, 
    currentModel, 
    setCurrentModel, 
    darkMode, 
    setDarkMode, 
    setLiveOpen, 
    setSettingsOpen, 
    setIsSidebarOpen 
}) {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-10 py-2 px-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700/50">
      <div className="flex items-center justify-between">
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsSidebarOpen(true)} 
          className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-500 dark:hover:text-indigo-400 lg:hidden" 
          aria-label="Open Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        {/* Model Select */}
        <div className="flex items-center flex-shrink min-w-0 lg:ml-0 ml-2">
          <div className="relative flex-shrink min-w-0">
            <select
              id="modelSelect"
              className="text-sm font-medium rounded-md py-1.5 pl-3 pr-8 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/60 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 appearance-none truncate cursor-pointer transition-colors" 
              value={currentModel}
              onChange={e => setCurrentModel(e.target.value)}
              title={models.find(m => m.id === currentModel)?.name || currentModel} 
            >
              {models.map(m => (
                <option key={m.id} value={m.id} title={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
        
        {/* Header Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all duration-150 ease-in-out group"
            title="Toggle Theme"
          >
            {darkMode ? <Sun className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110 group-hover:rotate-180" /> : <Moon className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110 group-hover:-rotate-12" />}
          </button>

          {/* Live Button */}
          <button
            onClick={() => setLiveOpen(true)}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400 transition-all duration-150 ease-in-out group"
            title="Start Live Session"
          >
            <MessageSquare className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-150 ease-in-out group"
            title="Chat Settings"
          >
            <Settings className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110 group-hover:rotate-45" />
          </button>
        </div>
      </div>
    </header>
  );
}