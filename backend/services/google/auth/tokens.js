// services/google/auth/tokens.js
import { createOAuth2Client } from './client.js';
import { google } from 'googleapis';

/**
 * Exchange auth code for tokens
 * @param {string} code - Authorization code from OAuth flow
 * @returns {Promise<Object>} OAuth tokens
 */
export async function getTokensFromCode(code) {
  const oauth2Client = createOAuth2Client();
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;  
  } catch (error) {
    console.error('Error getting tokens from code:', error);
    throw error;
  }
}

/**
 * Get user profile info from access token
 * @param {Object} tokens - OAuth tokens
 * @returns {Promise<Object>} User profile data
 */
export async function getUserProfile(tokens) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  
  try {
    // Use the userinfo.get endpoint which provides more complete profile data
    const res = await google.oauth2('v2').userinfo.get({ auth: oauth2Client });
    
    // Ensure the picture field is properly included
    const userData = {
      ...res.data,
      // Make sure picture is included and properly formatted
      picture: res.data.picture || null
    };
    
    return userData;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Verify if tokens are valid
 * @param {Object} tokens - OAuth tokens
 * @returns {Promise<boolean>} Whether tokens are valid
 */
export async function verifyTokens(tokens) {
  if (!tokens || !tokens.access_token) {
    return false;
  }
  
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  
  try {
    // Try to get user info as a way to check if token is valid
    await google.oauth2('v2').userinfo.get({ auth: oauth2Client });
    return true;
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
}

/**
 * Refresh access token if expired
 * @param {Object} tokens - OAuth tokens including refresh token
 * @returns {Promise<Object>} Updated tokens
 */
export async function refreshAccessToken(tokens) {
  if (!tokens || !tokens.refresh_token) {
    throw new Error('No refresh token available');
  }
  
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return {
      ...tokens,
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}