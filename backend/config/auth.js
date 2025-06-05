// config/auth.js
// Authentication state and cookie configuration 

// Auth cookie names
export const AUTH_COOKIE_NAME = 'apsara_auth';
export const AUTH_STATE_COOKIE = 'apsara_auth_state';

// Cookie options for auth tokens
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false, // Set to false for local development with HTTP
  sameSite: 'lax', // Use lax to allow redirect-based cookies
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Special cookie options for the state cookie (shorter lifespan)
export const STATE_COOKIE_OPTIONS = {
  httpOnly: true, 
  secure: false, // Must be false for local development with HTTP
  sameSite: 'lax', // More permissive for redirects
  path: '/',
  maxAge: 10 * 60 * 1000 // 10 minutes
};