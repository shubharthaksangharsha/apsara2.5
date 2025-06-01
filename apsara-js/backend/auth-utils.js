// auth-utils.js
import { google } from 'googleapis';
import crypto from 'crypto';
import fs from 'fs';

// Load Google OAuth credentials
let credentials;
try {
  const credentialsJson = fs.readFileSync('./credentials.json', 'utf8');
  credentials = JSON.parse(credentialsJson);
} catch (error) {
  console.error(`Error reading or parsing credentials.json: ${error.message}`);
  console.error('Please ensure \'credentials.json\' exists in the current directory and is correctly formatted.');
  console.log('Using environment variables for authentication if available, or empty credentials if not.');
  
  // Use default credentials from environment variables or empty placeholders
  credentials = {
    web: {
      client_id: process.env.GOOGLE_CLIENT_ID || 'placeholder-client-id',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder-client-secret',
      redirect_uris: [process.env.GOOGLE_REDIRECT_URI || 'http://localhost:9000/api/auth/google/callback'],
    }
  };
}

const { client_secret, client_id, redirect_uris } = credentials.web;
const REDIRECT_URI = process.env.AUTH_REDIRECT_URI || redirect_uris[0];

// Scopes define the level of access we're requesting
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar'
  // Maps API scope removed due to billing issues
  // 'https://www.googleapis.com/auth/maps.places'
];

// Create a new OAuth2 client
const createOAuth2Client = () => {
  return new google.auth.OAuth2(
    client_id,
    client_secret,
    REDIRECT_URI
  );
};

// Generate an authorization URL for Google OAuth
const generateAuthUrl = () => {
  const oauth2Client = createOAuth2Client();
  
  // Generate a state parameter to prevent CSRF attacks
  const state = crypto.randomBytes(16).toString('hex');
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    include_granted_scopes: true,
    state: state,
    prompt: 'consent' // Force getting a refresh token every time
  });
  
  return { authUrl, state };
};

// Exchange auth code for tokens
const getTokensFromCode = async (code) => {
  const oauth2Client = createOAuth2Client();
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Error getting tokens from code:', error);
    throw error;
  }
};

// Get user profile info from access token
const getUserProfile = async (tokens) => {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  
  const people = google.people({ version: 'v1', auth: oauth2Client });
  
  try {
    const res = await google.oauth2('v2').userinfo.get({ auth: oauth2Client });
    return res.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Verify if tokens are valid
const verifyTokens = async (tokens) => {
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
};

// Refresh access token if expired
const refreshAccessToken = async (tokens) => {
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
};

export {
  generateAuthUrl,
  getTokensFromCode,
  getUserProfile,
  verifyTokens,
  refreshAccessToken,
  createOAuth2Client
};
