// routes/auth.js
import express from 'express';
import { 
  AUTH_COOKIE_NAME, 
  AUTH_STATE_COOKIE, 
  COOKIE_OPTIONS, 
  STATE_COOKIE_OPTIONS 
} from '../config/auth.js';
import { 
  generateAuthUrl, 
  getTokensFromCode, 
  getUserProfile
} from '../services/google/auth/index.js';
import { FRONTEND_URL } from '../config/env.js';

const router = express.Router();

// Check authentication status
router.get('/status', (req, res) => {
  if (req.isAuthenticated && req.userProfile) {
    return res.json({
      isAuthenticated: true,
      profile: {
        id: req.userProfile.id,
        name: req.userProfile.name,
        email: req.userProfile.email,
        picture: req.userProfile.picture
      },
      // Also include user for backward compatibility
      user: {
        id: req.userProfile.id,
        name: req.userProfile.name,
        email: req.userProfile.email,
        picture: req.userProfile.picture
      }
    });
  }
  
  res.json({
    isAuthenticated: false,
    profile: null,
    user: null
  });
});

// Get Google OAuth URL
router.get('/google/url', (req, res) => {
  try {
    const { authUrl, state } = generateAuthUrl();
    
    // Store state in a cookie for verification during callback
    res.cookie(AUTH_STATE_COOKIE, state, STATE_COOKIE_OPTIONS);
    
    res.json({ url: authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authentication URL' });
  }
});

// Handle Google OAuth callback (POST version for programmatic API calls)
router.post('/google/callback', async (req, res) => {
  const { code, state } = req.body;
  const storedState = req.cookies[AUTH_STATE_COOKIE];
  
  // Verify state to prevent CSRF attacks
  if (!state || !storedState || state !== storedState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }
  
  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);
    
    // Get user profile
    const userProfile = await getUserProfile(tokens);
    
    // Store tokens in a cookie
    res.cookie(AUTH_COOKIE_NAME, JSON.stringify(tokens), COOKIE_OPTIONS);
    
    // Clear state cookie
    res.clearCookie(AUTH_STATE_COOKIE);
    
    res.json({
      success: true,
      user: userProfile
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Handle Google OAuth callback (GET version for redirect from Google)
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies[AUTH_STATE_COOKIE];
  
  // Debug logging
  console.log('Received state:', state);
  console.log('Stored state:', storedState);
  console.log('All cookies:', req.cookies);
  
  // Verify state to prevent CSRF attacks
  // In development, we'll bypass state verification to make authentication easier
  const isDevMode = process.env.NODE_ENV !== 'production' || !process.env.NODE_ENV;
  
  if (!isDevMode && (!state || !storedState || state !== storedState)) {
    return res.status(400).send('Invalid state parameter. Authentication failed. Check console logs for details.');
  } else if (isDevMode) {
    console.log('Development mode: Bypassing state verification for easier testing');
  }
  
  // Clear the state cookie regardless of validation (important for retry attempts)
  res.clearCookie(AUTH_STATE_COOKIE);
  
  try {
    console.log('Exchanging code for tokens...');
    // Exchange the authorization code for tokens
    const tokens = await getTokensFromCode(code);
    console.log('Tokens received:', tokens ? 'success' : 'failed');
    
    // Get user profile for logging purposes
    try {
      const userProfile = await getUserProfile(tokens);
      console.log('User profile fetched:', userProfile ? userProfile.email : 'No profile');
    } catch (profileError) {
      console.error('Error fetching user profile:', profileError);
      // Continue anyway - profile fetch is not critical
    }
    
    // Store tokens in an HTTP-only cookie
    console.log('Setting auth cookie...');
    res.cookie(AUTH_COOKIE_NAME, JSON.stringify(tokens), COOKIE_OPTIONS);
    
    // Set a visible cookie to confirm auth (non-httpOnly for client-side access)
    res.cookie('apsara_auth_status', 'authenticated', {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    console.log('Redirecting to frontend...');
    // Redirect to the frontend
    res.redirect(FRONTEND_URL);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed. Error: ' + error.message);
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.json({ success: true });
});

export default router;