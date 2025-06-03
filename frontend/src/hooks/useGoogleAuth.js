// useGoogleAuth.js - Custom hook for Google Authentication
import { useState, useEffect } from 'react';

const BACKEND_URL = 'http://localhost:9000';

export function useGoogleAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Check if user is already authenticated on mount and after redirects
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        console.log('Checking auth status...');
        const response = await fetch(`${BACKEND_URL}/api/auth/status`, {
          credentials: 'include' // Important for cookies
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Auth status response:', data);
          if (data.isAuthenticated) {
            setIsAuthenticated(true);
            
            // Store profile data in localStorage to avoid repeated fetching
            if (data.profile || data.user) {
              const profileData = data.profile || data.user;
              // Store the profile data without the picture URL to avoid rate limiting issues
              const safeProfile = {
                ...profileData,
                // Don't store the Google picture URL, use initials instead
                _hasPicture: !!profileData.picture
              };
              localStorage.setItem('apsara_user_profile', JSON.stringify(safeProfile));
              setUserProfile(safeProfile);
            }
          } else {
            setIsAuthenticated(false);
            setUserProfile(null);
            localStorage.removeItem('apsara_user_profile');
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        // Try to load from localStorage as fallback
        const savedProfile = localStorage.getItem('apsara_user_profile');
        if (savedProfile) {
          try {
            setUserProfile(JSON.parse(savedProfile));
            setIsAuthenticated(true);
          } catch (e) {
            console.error('Error parsing saved profile:', e);
          }
        }
      } finally {
        setIsAuthLoading(false);
      }
    };

    // Check if we have cached profile data
    const savedProfile = localStorage.getItem('apsara_user_profile');
    if (savedProfile) {
      try {
        setUserProfile(JSON.parse(savedProfile));
        setIsAuthenticated(true);
        setIsAuthLoading(false);
      } catch (e) {
        console.error('Error parsing saved profile:', e);
        // If there's an error with the cached data, perform a fresh check
        checkAuthStatus();
      }
    } else {
      // No cached data, perform a fresh check
      checkAuthStatus();
    }
    
    // Also check if we're returning from an OAuth redirect
    const checkForRedirect = () => {
      // Check for auth_status cookie as a sign of successful authentication
      const hasAuthCookie = document.cookie.includes('apsara_auth_status=authenticated');
      if (hasAuthCookie) {
        console.log('Found auth cookie - likely redirected from OAuth flow');
        checkAuthStatus(); // Re-check auth status if cookie is present
      }
    };
    
    checkForRedirect();
    
    // No interval needed - we check auth status once and store it
  }, []);

  // Function to initiate Google sign-in
  const signIn = async () => {
    try {
      // Get the auth URL from backend
      const response = await fetch(`${BACKEND_URL}/api/auth/google/url`);
      const { url } = await response.json();
      
      // Open the Google auth page in a new window
      window.location.href = url;
    } catch (error) {
      console.error('Error initiating Google sign-in:', error);
    }
  };

  // Function to sign out
  const signOut = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      
      setIsAuthenticated(false);
      setUserProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Function to skip authentication
  const skipAuth = () => {
    localStorage.setItem('google_auth_skipped', 'true');
    setIsAuthLoading(false);
  };

  // Check if auth was previously skipped
  const wasAuthSkipped = () => {
    return localStorage.getItem('google_auth_skipped') === 'true';
  };

  return {
    isAuthenticated,
    userProfile,
    isAuthLoading,
    signIn,
    signOut,
    skipAuth,
    wasAuthSkipped
  };
}
