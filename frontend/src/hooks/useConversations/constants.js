/**
 * Constants for conversations management
 */

import { MAX_LOCALSTORAGE_SIZE_MB, BYTES_PER_MB, MAX_STORAGE_BYTES } from '../common-constants';

// Re-export storage constants for backward compatibility
export { MAX_LOCALSTORAGE_SIZE_MB, BYTES_PER_MB, MAX_STORAGE_BYTES };

// LocalStorage keys
export const LS_KEY_CONVERSATIONS = 'conversations';

// Default conversation values
export const DEFAULT_TITLE = 'New Chat'; 