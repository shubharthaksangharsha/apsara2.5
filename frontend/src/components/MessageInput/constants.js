/**
 * Constants for the MessageInput component
 */

// Textarea configuration
export const MAX_INPUT_ROWS = 5; // Max 5 rows
export const BASE_TEXTAREA_HEIGHT_PX = 20; // Approximate height of a single line of text
export const PADDING_VERTICAL_PX = 16; // Combined top/bottom padding (8px + 8px)

// Classes
export const CONTAINER_CLASS = "px-2 py-2 sm:px-4 sm:py-3 bg-gray-50 dark:bg-gray-800 sticky bottom-0 z-20";
export const DRAGGING_CLASS = "outline-dashed outline-2 outline-indigo-500 dark:outline-indigo-400";
export const INPUT_WRAPPER_CLASS = "flex items-end gap-1 sm:gap-2 bg-white dark:bg-gray-700 rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm overflow-hidden";
export const TEXTAREA_CLASS = "flex-1 w-full resize-none py-1.5 sm:py-2 px-2 sm:px-3 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none custom-scrollbar placeholder-gray-500 dark:placeholder-gray-400 text-sm";

// Button classes
export const ACTION_BUTTON_CLASS = "p-1.5 sm:p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition group disabled:opacity-50";
export const SEND_BUTTON_CLASS = "p-1.5 sm:p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition group disabled:opacity-50";

// Drag and drop overlay
export const DROP_OVERLAY_CLASS = "absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 dark:bg-gray-800/80 pointer-events-none"; 