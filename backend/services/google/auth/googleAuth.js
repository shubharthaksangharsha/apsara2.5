// services/google/auth/googleAuth.js
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates an authenticated Google API client for specified service
 * @param {Object} req - Express request object with authentication tokens
 * @param {string} serviceName - Google API service name ('calendar', 'gmail', etc.)
 * @param {string} serviceVersion - API version
 */
export async function getAuthenticatedGoogleClient(req, serviceName, serviceVersion) {
  try {
    // Validate request object has authentication tokens
    if (!req || typeof req !== 'object') {
      throw new Error(`Invalid request object provided to Google ${serviceName} tool`);
    }
    
    // Check for authentication tokens
    if (!req.userTokens || !req.isAuthenticated) {
      throw new Error(`No authentication tokens available. User must be logged in to use ${serviceName} features.`);
    }
    
    // Get credentials from credentials.json (3 levels up from this file)
    let credentials;
    try {
      const credentialsPath = path.join(__dirname, '../../../credentials.json');
      const credentialsJson = fs.readFileSync(credentialsPath, 'utf8');
      credentials = JSON.parse(credentialsJson);
    } catch (error) {
      console.error(`Error reading credentials.json: ${error.message}`);
      throw new Error('Unable to load credentials. Please check your Google project configuration.');
    }
    
    const { client_id, client_secret } = credentials.web;
    const redirectUri = credentials.web.redirect_uris[0];
    const { access_token, refresh_token } = req.userTokens;
    
    if (!client_id || !client_secret || !redirectUri || !refresh_token) {
      throw new Error(`Missing required OAuth credentials for ${serviceName} access`);
    }
    
    const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);
    oauth2Client.setCredentials({ refresh_token, access_token });
    
    // It's good practice to ensure the access token is fresh
    try {
      await oauth2Client.getAccessToken();
    } catch (error) {
      console.error(`[GoogleAuth] Error refreshing access token: ${error.message}`);
      throw error;
    }
    
    // Return the appropriate Google API client
    return google[serviceName]({ version: serviceVersion, auth: oauth2Client });
  } catch (error) {
    console.error(`[GoogleAuth] Authentication error for ${serviceName}: ${error.message}`);
    throw error;
  }
}

/**
 * Gets an authenticated Calendar API client
 */
export async function getAuthenticatedCalendarClient(req) {
  return getAuthenticatedGoogleClient(req, 'calendar', 'v3');
}

/**
 * Gets an authenticated Gmail API client
 */
export async function getAuthenticatedGmailClient(req) {
  return getAuthenticatedGoogleClient(req, 'gmail', 'v1');
}