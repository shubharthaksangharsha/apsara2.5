// middleware/auth.js
import { AUTH_COOKIE_NAME, COOKIE_OPTIONS } from '../config/auth.js';
import { verifyTokens, refreshAccessToken, getUserProfile } from '../services/google/auth/tokens.js';
import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';

// Auth middleware to extract and verify tokens (supports both JWT and Google OAuth)
export const authMiddleware = async (req, res, next) => {
  // Initialize auth state
  req.isAuthenticated = false;
  req.userTokens = null;
  req.userProfile = null;
  req.user = null;

  // Check for JWT token first (traditional auth)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.isAuthenticated = true;
        req.user = user;
        req.userProfile = {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          picture: user.picture
        };
        return next();
      }
    } catch (error) {
      // JWT verification failed, continue to check Google OAuth
      console.log('JWT verification failed:', error.message);
    }
  }

  // Check for Google OAuth cookie (existing functionality)
  const authCookie = req.cookies[AUTH_COOKIE_NAME];
  
  if (!authCookie) {
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
          const googleProfile = await getUserProfile(req.userTokens);
          req.userProfile = googleProfile;
          
          // Try to find or create user in database
          if (googleProfile && googleProfile.id) {
            let user = await User.findOne({ googleId: googleProfile.id });
            
            // If user doesn't exist, create them
            if (!user) {
              user = await User.create({
                email: googleProfile.email,
                name: googleProfile.name,
                googleId: googleProfile.id,
                picture: googleProfile.picture,
                isVerified: true // Google users are pre-verified
              });
            }
            
            // Update login info
            await user.updateLoginInfo();
            req.user = user;
          }
        } catch (err) {
          console.error('Error getting user profile:', err);
          req.userProfile = null;
        }
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

// Export auth as an alias for authMiddleware to maintain compatibility
export const auth = authMiddleware;