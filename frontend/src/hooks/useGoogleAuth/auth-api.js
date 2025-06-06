/**
 * Google Auth API methods
 */

import { BACKEND_URL } from './constants';

/**
 * Check user authentication status
 * 
 * @returns {Promise<Object>} Auth status and profile information
 */
export const checkAuthStatus = async () => {
  const response = await fetch(`${BACKEND_URL}/api/auth/status`, {
    credentials: 'include' // Important for cookies
  });
  
  if (!response.ok) {
    throw new Error(`Auth status check failed: ${response.status}`);
  }
  
  return await response.json();
};

/**
 * Initiate Google sign-in process
 * 
 * @returns {Promise<string>} Google authentication URL
 */
export const getGoogleAuthUrl = async () => {
  const response = await fetch(`${BACKEND_URL}/api/auth/google/url`);
  
  if (!response.ok) {
    throw new Error(`Failed to get auth URL: ${response.status}`);
  }
  
  const data = await response.json();
  return data.url;
};

/**
 * Sign out current user
 * 
 * @returns {Promise<void>}
 */
export const signOutUser = async () => {
  const response = await fetch(`${BACKEND_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Sign out failed: ${response.status}`);
  }
}; 