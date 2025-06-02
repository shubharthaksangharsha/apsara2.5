import { useState, useEffect } from 'react';

export function useTheme() {
  const [darkMode, setDarkMode] = useState(() => {
    // Initialize state from localStorage or system preference (optional)
    const storedPreference = localStorage.getItem('darkMode');
    if (storedPreference !== null) {
      return storedPreference === 'true';
    }
    // Optional: Check system preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Apply class to root element
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Persist preference to localStorage
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  return [darkMode, setDarkMode];
}

