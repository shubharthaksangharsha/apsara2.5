// Constants for the MapDisplay component

// Default map configuration
export const DEFAULT_ZOOM = 13;
export const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 }; // San Francisco
export const DEFAULT_MAP_TYPE = 'roadmap';

// CSS Classes
export const CONTAINER_CLASS = 'w-full h-full rounded-lg overflow-hidden shadow-md border border-gray-300 dark:border-gray-700';
export const MAP_CLASS = 'w-full h-full';

// Map options
export const MAP_OPTIONS = {
  fullscreenControl: false,
  streetViewControl: false,
  mapTypeControlOptions: {
    style: 2, // DROPDOWN_MENU
    position: 6, // RIGHT_TOP
  },
  zoomControlOptions: {
    position: 9, // RIGHT_BOTTOM
  }
};

// API loading states
export const API_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
}; 