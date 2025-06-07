/**
 * Constants for the ChatWindow component
 */

// Backend URL for fetching file content
export const BACKEND_URL = 'http://localhost:9000';

// Message types
export const MESSAGE_TYPES = {
  USER: 'user',
  MODEL: 'model',
  SYSTEM: 'system',
  ERROR: 'error'
};

// CSS classes
export const USER_MESSAGE_CLASSES = "max-w-[80%] rounded-2xl px-4 py-3 break-words bg-indigo-500 text-white shadow-md";
export const MODEL_MESSAGE_CLASSES = "prose prose-sm dark:prose-invert max-w-none py-1";
export const SYSTEM_MESSAGE_CLASSES = "text-sm text-gray-500 dark:text-gray-400 italic px-3 py-2 bg-gray-100 dark:bg-gray-700/50 rounded-md";
export const ERROR_MESSAGE_CLASSES = "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-3 rounded-md";

// Copy button classes
export const COPY_BUTTON_CLASSES = "flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-500 dark:text-indigo-300 text-xs transition";

// Image preview classes
export const IMAGE_PREVIEW_CLASSES = "w-16 h-16 object-cover rounded";
export const IMAGE_CONTAINER_CLASSES = "relative bg-white p-1 rounded cursor-pointer hover:ring-2 hover:ring-white transition-all";

// Code block classes
export const CODE_BLOCK_CONTAINER_CLASSES = "my-3 bg-gray-800 dark:bg-black rounded-md overflow-hidden shadow";
export const CODE_BLOCK_HEADER_CLASSES = "px-4 py-2 text-xs text-gray-300 dark:text-gray-400 bg-gray-700 dark:bg-gray-900/70 flex justify-between items-center";
export const CODE_BLOCK_CONTENT_CLASSES = "p-4 overflow-x-auto custom-scrollbar text-sm";
export const CODE_BLOCK_BUTTON_CLASSES = "p-1 text-gray-300 hover:text-white transition";

// Code execution result classes
export const EXECUTION_RESULT_CONTAINER_CLASSES = "my-2 text-sm";
export const EXECUTION_RESULT_HEADER_CLASSES = "flex justify-between items-center px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400 rounded-r-md";
export const EXECUTION_RESULT_CONTENT_CLASSES = "whitespace-pre-wrap font-mono text-xs mt-1 p-3 bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500 dark:border-green-400 rounded-r-md";

// Thought summary classes
export const THOUGHT_CONTAINER_CLASSES = "my-2 text-sm";
export const THOUGHT_HEADER_CLASSES = "flex justify-between items-center px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 dark:border-purple-400 rounded-r-md cursor-pointer transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/30";
export const THOUGHT_CONTENT_CLASSES = "prose prose-sm dark:prose-invert max-w-none mt-1 p-3 bg-purple-50 dark:bg-purple-900/10 border-l-4 border-purple-500 dark:border-purple-400 rounded-r-md"; 