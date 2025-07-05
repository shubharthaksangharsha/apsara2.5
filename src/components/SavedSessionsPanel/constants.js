// Constants for the SavedSessionsPanel component

// Local storage key for saved sessions
export const STORAGE_KEY = 'apsara_saved_sessions';

// Maximum number of sessions to save
export const MAX_SESSIONS = 50;

// Maximum length of session title
export const MAX_TITLE_LENGTH = 50;

// CSS Classes
export const PANEL_CLASS = 'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden';
export const HEADER_CLASS = 'flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700';
export const LIST_CLASS = 'overflow-y-auto max-h-80';
export const EMPTY_STATE_CLASS = 'p-8 text-center text-gray-500 dark:text-gray-400';
export const SESSION_ITEM_CLASS = 'p-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors';
export const TITLE_CLASS = 'font-medium text-gray-800 dark:text-gray-200 truncate';
export const DATE_CLASS = 'text-xs text-gray-500 dark:text-gray-400 mt-1';
export const BUTTON_CLASS = 'text-sm px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors';
export const DELETE_BUTTON_CLASS = 'text-sm px-3 py-1 rounded-md bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/50 text-red-700 dark:text-red-300 transition-colors';

// Text Labels
export const PANEL_TITLE = 'Saved Sessions';
export const EMPTY_STATE_TEXT = 'No saved sessions yet';
export const SAVE_BUTTON_TEXT = 'Save Current';
export const CLEAR_BUTTON_TEXT = 'Clear All';
export const CONFIRM_CLEAR_MESSAGE = 'Are you sure you want to delete all saved sessions? This action cannot be undone.';
export const DEFAULT_SESSION_TITLE = 'Conversation'; 