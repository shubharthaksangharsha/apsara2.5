/**
 * Common constants shared across multiple hooks and components
 */

// API endpoint base URL
export const BACKEND_URL = 'http://localhost:9000';

// LocalStorage constraints
export const MAX_LOCALSTORAGE_SIZE_MB = 4.5;
export const BYTES_PER_MB = 1024 * 1024;
export const MAX_STORAGE_BYTES = MAX_LOCALSTORAGE_SIZE_MB * BYTES_PER_MB; 