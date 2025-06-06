/**
 * Utilities for persisting app settings
 */

import { LS_KEYS } from './constants';

/**
 * Loads a value from localStorage with a default fallback
 * 
 * @param {string} key - LocalStorage key
 * @param {any} defaultValue - Default value if not found
 * @param {Function} transform - Optional transform function for the loaded value
 * @returns {any} - The loaded value or default
 */
export const loadFromStorage = (key, defaultValue, transform = null) => {
  try {
    const storedValue = localStorage.getItem(key);
    if (storedValue === null) return defaultValue;
    
    return transform ? transform(storedValue) : storedValue;
  } catch (e) {
    console.error(`Error loading ${key} from localStorage:`, e);
    return defaultValue;
  }
};

/**
 * Saves a value to localStorage
 * 
 * @param {string} key - LocalStorage key
 * @param {any} value - Value to save
 * @param {Function} transform - Optional transform function for the value before saving
 */
export const saveToStorage = (key, value, transform = null) => {
  try {
    const valueToStore = transform ? transform(value) : value;
    localStorage.setItem(key, valueToStore);
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
};

/**
 * Removes a key from localStorage
 * 
 * @param {string} key - LocalStorage key to remove
 */
export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Error removing ${key} from localStorage:`, e);
  }
}; 