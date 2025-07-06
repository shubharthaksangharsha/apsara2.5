/**
 * Constants for file-related components
 */

// FilePreviewBar classes
export const PREVIEW_BAR_CONTAINER = "px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-b border-gray-200 dark:border-gray-700";
export const PREVIEW_LIST_CONTAINER = "flex flex-col gap-2 max-h-32 overflow-y-auto custom-scrollbar";

// FilePreviewItem classes
export const PREVIEW_ITEM_CONTAINER = "flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-xs";
export const ICON_CONTAINER = "flex items-center gap-2 overflow-hidden";
export const FILE_NAME = "truncate";
export const FILE_SIZE = "text-gray-500 dark:text-gray-400 flex-shrink-0";
export const REMOVE_BUTTON = "p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600";

// FileUploadPopup classes
export const POPUP_OVERLAY = "fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4";
export const POPUP_CONTAINER = "w-full max-w-lg bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-gray-800 dark:text-gray-200";
export const POPUP_HEADER = "flex justify-between items-center mb-6";
export const POPUP_TITLE = "text-xl font-bold flex items-center gap-2";
export const CLOSE_BUTTON = "p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700";
export const DROP_ZONE_BASE = "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200";
export const DROP_ZONE_ACTIVE = "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20";
export const DROP_ZONE_INACTIVE = "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500";
export const DROP_ZONE_DISABLED = "opacity-50 cursor-not-allowed";
export const UPLOAD_BUTTON = "mt-4 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
export const ERROR_MESSAGE = "p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-md";
export const FILE_LIST_CONTAINER = "space-y-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50 dark:bg-gray-700/50 custom-scrollbar";
export const FILE_LIST_ITEM = "text-xs flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded shadow-sm";
export const DONE_BUTTON = "px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"; 