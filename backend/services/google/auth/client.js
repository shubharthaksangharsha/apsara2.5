// services/google/auth/client.js
import { google } from 'googleapis';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to credentials.json (in the backend root folder)
const CREDENTIALS_PATH = path.join(__dirname, '../../../credentials.json');

// Load Google OAuth credentials
let credentials;
try {
  const credentialsJson = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
  credentials = JSON.parse(credentialsJson);
} catch (error) {
  console.error(`Error reading or parsing credentials.json: ${error.message}`);
  console.error('Please ensure \'credentials.json\' exists in the backend root directory and is correctly formatted.');
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
export const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar'
];

/**
 * Create a new OAuth2 client
 * @returns {OAuth2Client} OAuth2 client
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    client_id,
    client_secret,
    REDIRECT_URI
  );
}

/**
 * Generate an authorization URL for Google OAuth
 * @returns {Object} Auth URL and state
 */
export function generateAuthUrl() {
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
}