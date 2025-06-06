import { useState, useEffect } from 'react';
import { loadThemePreference, applyThemeToDOM, saveThemePreference } from './theme-utils';

/**
 * Hook for managing dark/light theme
 * 
 * @returns {Array} - [darkMode, setDarkMode] state and setter
 */
export function useTheme() {
  // Initialize state from localStorage or system preference
  const [darkMode, setDarkMode] = useState(() => loadThemePreference());

  // Apply theme changes to DOM and save preference
  useEffect(() => {
    applyThemeToDOM(darkMode);
    saveThemePreference(darkMode);
  }, [darkMode]);

  return [darkMode, setDarkMode];
} 