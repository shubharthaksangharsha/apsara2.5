import React, { Fragment } from 'react';
import { Menu, Sun, Moon, MessageSquare, Settings, Check, ChevronsUpDown } from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';

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
  const selectedModelObject = models.find(m => m.id === currentModel);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-20 py-2 px-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700/50">
      <div className="flex items-center justify-between">
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsSidebarOpen(true)} 
          className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-500 dark:hover:text-indigo-400 lg:hidden" 
          aria-label="Open Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        {/* Model Select - Custom with Headless UI Listbox */}
        <div className="flex items-center flex-shrink min-w-0 lg:ml-0 ml-2">
          <Listbox value={currentModel} onChange={setCurrentModel}>
            <div className="relative w-auto min-w-[200px] max-w-[280px] sm:min-w-[240px]">
              <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-gray-100 dark:bg-gray-700/50 py-2 pl-3 pr-10 text-left shadow-md hover:bg-gray-200 dark:hover:bg-gray-600/60 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm transition-colors">
                <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedModelObject?.name || 'Select Model'}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronsUpDown
                    className="h-5 w-5 text-gray-400 dark:text-gray-500"
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
                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-30">
                  {models.map((model) => (
                    <Listbox.Option
                      key={model.id}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
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
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600 dark:text-indigo-300">
                              <Check className="h-5 w-5" aria-hidden="true" />
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