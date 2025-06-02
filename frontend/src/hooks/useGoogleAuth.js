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
            setUserProfile(data.profile || data.user); // Handle either profile or user key
          } else {
            setIsAuthenticated(false);
            setUserProfile(null);
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuthStatus();
    
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
    
    // Set interval to periodically check auth status (every 5 seconds)
    const intervalId = setInterval(checkAuthStatus, 5000);
    return () => clearInterval(intervalId);
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
