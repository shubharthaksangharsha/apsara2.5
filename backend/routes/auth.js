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
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import User from '../models/User.js';
import EmailService from '../services/email.js';
import crypto from 'crypto';

const router = express.Router();

// === TRADITIONAL AUTH ROUTES ===

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check if it's a Gmail account
    const isGmailAccount = email.toLowerCase().endsWith('@gmail.com');
    
    // Create new user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      name: name.trim(),
      // Gmail accounts get verified immediately for convenience
      // Regular accounts need email verification
      isVerified: isGmailAccount
    });

    if (!isGmailAccount) {
      // Send verification email for non-Gmail accounts
      const verificationToken = user.createEmailVerificationToken();
      await user.save();

      try {
        await EmailService.sendVerificationEmail(user.email, user.name, verificationToken);
        
        return res.status(201).json({
          success: true,
          message: 'Registration successful! Please check your email to verify your account.',
          requiresVerification: true,
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            isVerified: false
          }
        });
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Clean up the user if email fails
        await User.findByIdAndDelete(user._id);
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification email. Please try again.'
        });
      }
    } else {
      // Gmail account - immediate verification + welcome email
      const tokens = generateTokens(user._id);
      
      try {
        await EmailService.sendWelcomeEmail(user.email, user.name);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail registration if welcome email fails
      }

      await user.updateLoginInfo();

      return res.status(201).json({
        success: true,
        message: 'Account created successfully! Welcome to Apsara.',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          isVerified: true
        },
        tokens
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user with password (explicitly select it)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        requiresVerification: true
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const tokens = generateTokens(user._id);

    // Update login info
    await user.updateLoginInfo();

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture
      },
      tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send reset email
    try {
      await EmailService.sendPasswordResetEmail(user.email, resetToken, user.name);
      
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      
      // Clear the reset token if email failed
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      
      res.status(500).json({
        success: false,
        message: 'Error sending reset email. Please try again.'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find user with valid reset token
    const user = await User.findByPasswordResetToken(token);
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password and clear reset token
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Email verification
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Find user with valid verification token
    const user = await User.findByEmailVerificationToken(token);
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Verify the user
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email
    try {
      await EmailService.sendWelcomeEmail(user.email, user.name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail verification if welcome email fails
    }

    res.json({
      success: true,
      message: 'Email verified successfully! You can now login to your account.',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isVerified: true
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save();

    // Send verification email
    try {
      await EmailService.sendVerificationEmail(user.email, user.name, verificationToken);
      
      res.json({
        success: true,
        message: 'Verification email sent! Please check your inbox.'
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user._id);

    res.json({
      success: true,
      tokens
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
});

// === GOOGLE OAUTH ROUTES (EXISTING) ===

// Check authentication status
router.get('/status', (req, res) => {
  if (req.isAuthenticated && (req.userProfile || req.user)) {
    // Determine if this is a Google OAuth authentication
    const isGoogleAuth = Boolean(req.userProfile || req.cookies[AUTH_COOKIE_NAME]);
    
    const profile = req.userProfile || {
      id: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email,
      picture: req.user.picture,
      // Add the auth provider field to identify Google authentication
      auth_provider: isGoogleAuth ? 'google' : 'email'
    };

    // For Google auth, ensure we also add the googleId property if missing
    if (isGoogleAuth && !profile.googleId && profile.id) {
      profile.googleId = profile.id;
    }

    return res.json({
      isAuthenticated: true,
      profile,
      // Also include user for backward compatibility
      user: profile
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

// Logout (works for both traditional and Google auth)
router.post('/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.clearCookie('apsara_auth_status');
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;