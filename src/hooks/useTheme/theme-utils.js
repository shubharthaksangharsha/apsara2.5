/**
 * Theme utility functions
 */

const LOCAL_STORAGE_KEY = 'darkMode';

/**
 * Loads theme preference from localStorage or system preference
 * 
 * @returns {boolean} - Whether dark mode is enabled
 */
export const loadThemePreference = () => {
  // Initialize state from localStorage or system preference
  const storedPreference = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (storedPreference !== null) {
    return storedPreference === 'true';
  }
  // Fallback to system preference
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * Applies theme to DOM by adding/removing the 'dark' class
 * 
 * @param {boolean} isDarkMode - Whether dark mode is enabled
 */
export const applyThemeToDOM = (isDarkMode) => {
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

/**
 * Saves theme preference to localStorage
 * 
 * @param {boolean} isDarkMode - Whether dark mode is enabled
 */
export const saveThemePreference = (isDarkMode) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, isDarkMode);
}; 