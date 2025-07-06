// services/tools/index.js
// Main entry point for all tools

// Import tool modules
import { coreToolSchemas, coreToolHandlers } from './core/index.js';
import { weatherToolSchemas, weatherToolHandlers } from './weather/index.js';
import { uiToolSchemas, uiToolHandlers } from './ui/index.js';
import { notesToolSchemas, notesToolHandlers } from './notes/index.js';

// Import Google service tool modules
import { gmailToolSchemas, gmailToolHandlers } from '../google/gmail/index.js';
import { calendarToolSchemas, calendarToolHandlers } from '../google/calendar/index.js';
import { mapsToolSchemas, mapsToolHandlers } from '../google/maps/index.js';

// Combine all tool schemas
const baseToolDeclarations = [
  ...coreToolSchemas,
  ...weatherToolSchemas,
  ...uiToolSchemas,
  ...notesToolSchemas,
];

// Google-specific tool declarations (require authentication)
const googleToolDeclarations = [
  ...gmailToolSchemas,
  ...calendarToolSchemas,
  ...mapsToolSchemas,
];

// Default tool declarations with all tools included
export const customToolDeclarations = [
  ...baseToolDeclarations,
  ...googleToolDeclarations,
];

// Combine all tool handlers
export const toolHandlers = {
  // Core tools
  ...coreToolHandlers,
  
  // Weather tools
  ...weatherToolHandlers,
  
  // UI tools
  ...uiToolHandlers,
  
  // Notes tools
  ...notesToolHandlers,
  
  // Google tools
  ...gmailToolHandlers,
  ...calendarToolHandlers,
  ...mapsToolHandlers,
};

/**
 * Function to get tool declarations based on authentication status
 * @param {boolean} isAuthenticated - Whether the user is authenticated
 * @returns {Array} - Array of tool declarations
 */
export const getToolDeclarations = (isAuthenticated = false) => {
  if (isAuthenticated) {
    return customToolDeclarations;
  } else {
    return baseToolDeclarations;
  }
};

// Export just the names for the system prompt
export const customToolNames = Object.keys(toolHandlers);