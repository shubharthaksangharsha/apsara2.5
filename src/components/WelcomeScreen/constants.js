/**
 * Constants for the WelcomeScreen component
 */

// Animation duration for shimmer effect
export const ANIMATION_DURATION = '3s';

// Text sizes
export const TEXT_SIZES = {
  SMALL: 'text-xs sm:text-sm md:text-base',
  HEADING: 'text-xl sm:text-2xl md:text-3xl',
};

// Button variants
export const BUTTON_VARIANTS = {
  PRIMARY: 'px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 ease-in-out group shadow-md hover:shadow-lg transform hover:scale-105 text-xs sm:text-sm md:text-base',
  SECONDARY: 'flex items-center justify-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm shadow-sm',
  TERTIARY: 'flex items-center justify-center px-4 py-2 bg-transparent border border-gray-300 dark:border-gray-700 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm',
  LINK: 'flex items-center justify-center px-3 py-1.5 mb-4 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs',
};

// Status indicator variants
export const STATUS_INDICATOR_VARIANTS = {
  SUCCESS: 'flex items-center justify-center mb-4 py-2 px-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-xs',
  WARNING: 'flex items-center justify-center mb-4 py-2 px-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-md text-xs',
}; 