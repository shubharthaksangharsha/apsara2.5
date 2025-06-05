// middleware/auth.js
import { AUTH_COOKIE_NAME, COOKIE_OPTIONS } from '../config/auth.js';
import { verifyTokens, refreshAccessToken, getUserProfile } from '../services/google/auth/tokens.js';

// Auth middleware to extract and verify tokens
export const authMiddleware = async (req, res, next) => {
  const authCookie = req.cookies[AUTH_COOKIE_NAME];
  
  if (!authCookie) {
    req.isAuthenticated = false;
    req.userTokens = null;
    req.userProfile = null;
    return next();
  }
  
  try {
    const tokens = JSON.parse(authCookie);
    
    // Check if access token is expired
    if (tokens.expiry_date && Date.now() > tokens.expiry_date) {
      // Try to refresh the token
      if (tokens.refresh_token) {
        const newTokens = await refreshAccessToken(tokens);
        res.cookie(AUTH_COOKIE_NAME, JSON.stringify(newTokens), COOKIE_OPTIONS);
        req.userTokens = newTokens;
      } else {
        req.isAuthenticated = false;
        req.userTokens = null;
        req.userProfile = null;
        return next();
      }
    } else {
      req.userTokens = tokens;
    }
    
    // Get user profile if we have valid tokens
    if (req.userTokens) {
      const isValid = await verifyTokens(req.userTokens);
      if (isValid) {
        req.isAuthenticated = true;
        try {
          req.userProfile = await getUserProfile(req.userTokens);
        } catch (err) {
          console.error('Error getting user profile:', err);
          req.userProfile = null;
        }
      } else {
        req.isAuthenticated = false;
        req.userProfile = null;
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    req.isAuthenticated = false;
    req.userTokens = null;
    req.userProfile = null;
  }
  
  next();
};