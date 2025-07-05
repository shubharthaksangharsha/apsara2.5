/**
 * Common constants used across UI components
 */

// Theme-related constants
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

// Animation durations
export const ANIMATION = {
  DEFAULT: '300ms',
  FAST: '150ms',
  SLOW: '500ms',
};

// Responsive breakpoints (matching Tailwind defaults)
export const BREAKPOINTS = {
  SM: 640, // Small devices like mobile phones
  MD: 768, // Medium devices like tablets
  LG: 1024, // Large devices like laptops
  XL: 1280, // Extra large devices like desktops
  XXL: 1536, // 2XL breakpoint
};

// Common z-index values
export const Z_INDEX = {
  HEADER: 20,
  SIDEBAR: 50,
  MODAL: 60,
  POPUP: 70,
  TOOLTIP: 80,
};

export const DEFAULT_SIDEBAR_WIDTH = {
  COLLAPSED: '5rem', // 80px
  EXPANDED: '16rem', // 256px
};

// Header height for layout calculations
export const HEADER_HEIGHT = '3.5rem'; // 56px 