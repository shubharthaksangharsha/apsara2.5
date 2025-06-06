import { useState, useEffect } from 'react';
import { 
  saveProfileToStorage,
  loadProfileFromStorage, 
  clearProfileFromStorage,
  setAuthSkipped,
  wasAuthSkipped
} from './storage-utils';
import { checkAuthStatus, getGoogleAuthUrl, signOutUser } from './auth-api';

/**
 * Hook for Google Authentication
 * 
 * @returns {Object} Auth state and functions
 */
export function useGoogleAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Check if user is already authenticated on mount and after redirects
  useEffect(() => {
    const handleAuthCheck = async () => {
      try {
        console.log('Checking auth status...');
        const data = await checkAuthStatus();
        
        console.log('Auth status response:', data);
        if (data.isAuthenticated) {
          setIsAuthenticated(true);
          
          // Store profile data in localStorage to avoid repeated fetching
          if (data.profile || data.user) {
            const profileData = data.profile || data.user;
            saveProfileToStorage(profileData);
            setUserProfile(profileData);
          }
        } else {
          setIsAuthenticated(false);
          setUserProfile(null);
          clearProfileFromStorage();
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        // Try to load from localStorage as fallback
        const savedProfile = loadProfileFromStorage();
        if (savedProfile) {
          setUserProfile(savedProfile);
          setIsAuthenticated(true);
        }
      } finally {
        setIsAuthLoading(false);
      }
    };

    // Check if we have cached profile data
    const savedProfile = loadProfileFromStorage();
    if (savedProfile) {
      try {
        setUserProfile(savedProfile);
        setIsAuthenticated(true);
        setIsAuthLoading(false);
      } catch (e) {
        console.error('Error parsing saved profile:', e);
        // If there's an error with the cached data, perform a fresh check
        handleAuthCheck();
      }
    } else {
      // No cached data, perform a fresh check
      handleAuthCheck();
    }
    
    // Also check if we're returning from an OAuth redirect
    const checkForRedirect = () => {
      // Check for auth_status cookie as a sign of successful authentication
      const hasAuthCookie = document.cookie.includes('apsara_auth_status=authenticated');
      if (hasAuthCookie) {
        console.log('Found auth cookie - likely redirected from OAuth flow');
        handleAuthCheck(); // Re-check auth status if cookie is present
      }
    };
    
    checkForRedirect();
    
    // No interval needed - we check auth status once and store it
  }, []);

  /**
   * Function to initiate Google sign-in
   */
  const signIn = async () => {
    try {
      // Get the auth URL from backend
      const url = await getGoogleAuthUrl();
      
      // Open the Google auth page in a new window
      window.location.href = url;
    } catch (error) {
      console.error('Error initiating Google sign-in:', error);
    }
  };

  /**
   * Function to sign out
   */
  const signOut = async () => {
    try {
      await signOutUser();
      
      setIsAuthenticated(false);
      setUserProfile(null);
      clearProfileFromStorage();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  /**
   * Function to skip authentication
   */
  const skipAuth = () => {
    setAuthSkipped();
    setIsAuthLoading(false);
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