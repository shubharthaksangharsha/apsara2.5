/**
 * Constants for the MessageInput component
 */

// Textarea configuration
export const MAX_INPUT_ROWS = 5; // Max 5 rows
export const BASE_TEXTAREA_HEIGHT_PX = 20; // Approximate height of a single line of text
export const PADDING_VERTICAL_PX = 16; // Combined top/bottom padding (8px + 8px)

// Classes
export const CONTAINER_CLASS = "border-t border-gray-200 dark:border-gray-700 px-2 py-2 sm:px-4 sm:py-3 bg-gray-50 dark:bg-gray-800 sticky bottom-0 z-10";
export const DRAGGING_CLASS = "outline-dashed outline-2 outline-indigo-500 dark:outline-indigo-400";
export const INPUT_WRAPPER_CLASS = "flex items-end gap-1 sm:gap-2 bg-white dark:bg-gray-700 rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500";
export const TEXTAREA_CLASS = "flex-1 w-full resize-none py-1.5 sm:py-2 px-2 sm:px-3 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none custom-scrollbar placeholder-gray-500 dark:placeholder-gray-400 text-sm";

// Button classes
export const ACTION_BUTTON_CLASS = "p-1.5 sm:p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition group disabled:opacity-50";
export const SEND_BUTTON_CLASS = "p-1.5 sm:p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition group disabled:opacity-50";

// Switch classes
export const SWITCH_ACTIVE_CLASS = "bg-indigo-600";
export const SWITCH_INACTIVE_CLASS = "bg-gray-300 dark:bg-gray-500";
export const SWITCH_BASE_CLASS = "relative inline-flex h-[20px] w-[36px] sm:h-[22px] sm:w-[40px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 disabled:opacity-50";
export const SWITCH_ICON_CLASS = "absolute top-0.5 left-0.5 h-3 w-3 sm:h-4 sm:w-4 text-yellow-300 transition-opacity";
export const SWITCH_HANDLE_CLASS = "pointer-events-none inline-block h-[16px] w-[16px] sm:h-[18px] sm:w-[18px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out";
export const SWITCH_HANDLE_ACTIVE_CLASS = "translate-x-[16px] sm:translate-x-[18px]";
export const SWITCH_HANDLE_INACTIVE_CLASS = "translate-x-0";

// Drag and drop overlay
export const DROP_OVERLAY_CLASS = "absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 dark:bg-gray-800/80 pointer-events-none"; 