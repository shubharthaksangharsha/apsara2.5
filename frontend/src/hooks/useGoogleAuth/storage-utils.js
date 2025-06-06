/**
 * Storage utilities for auth data
 */

import { LOCAL_STORAGE_KEYS } from './constants';

/**
 * Save user profile to localStorage
 * 
 * @param {Object} profile - User profile data
 */
export const saveProfileToStorage = (profile) => {
  if (!profile) {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.PROFILE);
    return;
  }

  // Store the profile data without the picture URL to avoid rate limiting issues
  const safeProfile = {
    ...profile,
    // Don't store the Google picture URL, use initials instead
    _hasPicture: !!profile.picture
  };
  
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.PROFILE, JSON.stringify(safeProfile));
  } catch (e) {
    console.error('Error saving profile to localStorage:', e);
  }
};

/**
 * Load user profile from localStorage
 * 
 * @returns {Object|null} User profile or null if not found
 */
export const loadProfileFromStorage = () => {
  try {
    const savedProfile = localStorage.getItem(LOCAL_STORAGE_KEYS.PROFILE);
    return savedProfile ? JSON.parse(savedProfile) : null;
  } catch (e) {
    console.error('Error parsing saved profile:', e);
    return null;
  }
};

/**
 * Clear user profile from localStorage
 */
export const clearProfileFromStorage = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.PROFILE);
};

/**
 * Mark auth as skipped in localStorage
 */
export const setAuthSkipped = () => {
  localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_SKIPPED, 'true');
};

/**
 * Check if auth was previously skipped
 * 
 * @returns {boolean} Whether auth was skipped
 */
export const wasAuthSkipped = () => {
  return localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_SKIPPED) === 'true';
}; 