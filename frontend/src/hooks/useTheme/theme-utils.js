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
 * Applies theme to DOM by adding/removing the 'dark' class and updating terminal elements
 * 
 * @param {boolean} isDarkMode - Whether dark mode is enabled
 */
export const applyThemeToDOM = (isDarkMode) => {
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  // Update all existing terminal elements
  updateExistingTerminals(isDarkMode);
};

/**
 * Updates theme for all existing terminal elements
 * 
 * @param {boolean} isDarkMode - Whether dark mode is enabled
 */
const updateExistingTerminals = (isDarkMode) => {
  // Find all terminal elements
  const terminalElements = document.querySelectorAll('[data-terminal-element="true"]');
  
  // Update each terminal with the new theme
  terminalElements.forEach(terminal => {
    // Update class
    terminal.className = 'code-execution-result ' + (isDarkMode ? 'dark-theme' : 'light-theme');
    
    // Update header colors
    const headerBackground = isDarkMode ? 
      'linear-gradient(to right, #2C3E50, #1E2A3A)' : 
      'linear-gradient(to right, #4a6984, #385678)';
    const headerBorderColor = isDarkMode ? '#3a506b' : '#3a5a7a';
    const bodyBackground = isDarkMode ? '#1E1E1E' : '#e9ecef';
    const bodyBorderColor = isDarkMode ? '#333' : '#ced4da';
    const textColor = isDarkMode ? '#f0f0f0' : '#333';
    const scrollbarColor = isDarkMode ? '#666 #1E1E1E' : '#adb5bd #e9ecef';
    
    // Update terminal header
    const header = terminal.querySelector('.terminal-header');
    if (header) {
      header.style.background = headerBackground;
      header.style.borderBottom = `1px solid ${headerBorderColor}`;
    }
    
    // Update terminal body
    const body = terminal.querySelector('.terminal-body');
    if (body) {
      body.style.background = bodyBackground;
      body.style.color = textColor;
      body.style.borderColor = bodyBorderColor;
      body.style.scrollbarColor = scrollbarColor;
    }
    
          // Update file links and icons
     const fileLinks = terminal.querySelectorAll('.terminal-files a');
     fileLinks.forEach(link => {
       link.style.color = isDarkMode ? '#64B5F6' : '#0d6efd';
       link.onmouseover = () => { link.style.color = isDarkMode ? '#90CAF9' : '#0a58ca'; };
       link.onmouseout = () => { link.style.color = isDarkMode ? '#64B5F6' : '#0d6efd'; };
     });
     
     const fileIcons = terminal.querySelectorAll('.terminal-files svg');
     fileIcons.forEach(icon => {
       icon.style.color = isDarkMode ? '#64B5F6' : '#0d6efd';
     });
     
     const showButtons = terminal.querySelectorAll('.terminal-files button');
     showButtons.forEach(button => {
       button.style.color = isDarkMode ? '#64FFDA' : '#198754';
       
       // Update button text based on current state
       if (button.innerText.includes('Hide')) {
         button.innerHTML = button.innerHTML.replace('Hide', 'Hide');
       } else {
         button.innerHTML = button.innerHTML.replace('Show', 'Show');
       }
     });
    
    // Update files heading
    const filesHeading = terminal.querySelector('.terminal-files h4');
    if (filesHeading) {
      filesHeading.style.color = isDarkMode ? '#64FFDA' : '#2c7854';
    }
  });
};

/**
 * Saves theme preference to localStorage
 * 
 * @param {boolean} isDarkMode - Whether dark mode is enabled
 */
export const saveThemePreference = (isDarkMode) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, isDarkMode);
}; 