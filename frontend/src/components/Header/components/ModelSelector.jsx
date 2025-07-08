import React, { Fragment } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';

/**
 * Model selector dropdown component
 *
 * @param {Object} props - Component props
 * @param {Array} props.models - List of available models
 * @param {string} props.currentModel - Currently selected model ID
 * @param {Function} props.setCurrentModel - Function to update the selected model
 * @param {boolean} props.isMobile - Whether viewport is mobile size
 * @returns {JSX.Element} Model selector dropdown
 */
const ModelSelector = ({ models, currentModel, setCurrentModel, isMobile }) => {
  const selectedModelObject = models.find(m => m.id === currentModel);

  return (
    <div className="flex items-center flex-shrink min-w-0">
      <Listbox value={currentModel} onChange={setCurrentModel}>
        <div className={`relative w-auto ${
          isMobile 
            ? 'min-w-[140px] max-w-[180px]' 
            : 'min-w-[180px] max-w-[220px] sm:min-w-[240px] sm:max-w-[280px]'
        }`}>
          <Listbox.Button className={`relative w-full cursor-pointer rounded-lg bg-gray-100 dark:bg-gray-700/50 pl-2 text-left shadow-md hover:bg-gray-200 dark:hover:bg-gray-600/60 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 transition-colors ${
            isMobile 
              ? 'py-1 pr-6 text-xs' 
              : 'py-1.5 sm:py-2 sm:pl-3 pr-8 sm:pr-10 text-xs sm:text-sm'
          }`}>
            <span className={`block truncate font-medium text-gray-900 dark:text-gray-100 ${
              isMobile ? 'text-xs' : 'text-xs sm:text-sm'
            }`}>
              {selectedModelObject?.name || 'Select Model'}
            </span>
            <span className={`pointer-events-none absolute inset-y-0 right-0 flex items-center ${
              isMobile ? 'pr-1' : 'pr-1 sm:pr-2'
            }`}>
              <ChevronsUpDown
                className={`text-gray-400 dark:text-gray-500 ${
                  isMobile ? 'h-3 w-3' : 'h-4 w-4 sm:h-5 sm:w-5'
                }`}
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
  );
};

export default ModelSelector; 