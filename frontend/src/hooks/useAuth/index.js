// hooks/useAuth/index.js
import { useState, useEffect, useCallback } from 'react';

/**
 * Comprehensive authentication hook that handles both traditional and Google OAuth
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user has valid tokens
  const hasValidTokens = useCallback(() => {
    const accessToken = localStorage.getItem('accessToken');
    return !!accessToken;
  }, []);

  // Get auth headers for API requests
  const getAuthHeaders = useCallback(() => {
    const accessToken = localStorage.getItem('accessToken');
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }, []);

  // Make authenticated API request
  const authenticatedFetch = useCallback(async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If token is expired, try to refresh
    if (response.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        // Retry the request with new token
        const newHeaders = {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
          ...options.headers,
        };
        return fetch(url, {
          ...options,
          headers: newHeaders,
        });
      } else {
        // Refresh failed, logout user
        logout();
        throw new Error('Authentication expired');
      }
    }

    return response;
  }, [getAuthHeaders]);

  // Refresh access token
  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        return false;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (data.success && data.tokens) {
        localStorage.setItem('accessToken', data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.tokens.refreshToken);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, []);

  // Check authentication status
  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      
      // First check if we have tokens
      if (!hasValidTokens()) {
        // Try to check with existing Google OAuth
        const response = await fetch('/api/auth/status', {
          credentials: 'include',
        });
        
        const data = await response.json();
        
        if (data.isAuthenticated && data.user) {
          setIsAuthenticated(true);
          setUser(data.user);
          return;
        }
        
        // No authentication found
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      // We have tokens, verify them
      const response = await authenticatedFetch('/api/auth/status');
      
      if (response.ok) {
        const data = await response.json();
        if (data.isAuthenticated && data.user) {
          setIsAuthenticated(true);
          setUser(data.user);
        } else {
          setIsAuthenticated(false);
          setUser(null);
          // Clear invalid tokens
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      } else {
        // Token invalid, clear and check Google OAuth
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        const fallbackResponse = await fetch('/api/auth/status', {
          credentials: 'include',
        });
        
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData.isAuthenticated && fallbackData.user) {
          setIsAuthenticated(true);
          setUser(fallbackData.user);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      setError(error.message);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [hasValidTokens, authenticatedFetch]);

  // Login with email/password
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔐 useAuth: Making login request...');

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('🔐 useAuth: Response status:', response.status);

      const data = await response.json();
      console.log('🔐 useAuth: Response data:', data);

      if (data.success) {
        if (data.tokens) {
          localStorage.setItem('accessToken', data.tokens.accessToken);
          localStorage.setItem('refreshToken', data.tokens.refreshToken);
        }
        
        setIsAuthenticated(true);
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        console.log('🔐 useAuth: Login failed with message:', data.message);
        setError(data.message);
        return { 
          success: false, 
          error: data.message || 'Authentication failed',
          requiresVerification: data.requiresVerification 
        };
      }
    } catch (error) {
      console.error('🔐 useAuth: Network error during login:', error);
      setError('Network error. Please try again.');
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Register new user
  const register = useCallback(async (name, email, password) => {
    try {
      setLoading(true);
      setError(null);

      console.log('📝 useAuth: Making register request...');

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      console.log('📝 useAuth: Response status:', response.status);

      const data = await response.json();
      console.log('📝 useAuth: Response data:', data);

      if (data.success) {
        if (data.tokens) {
          localStorage.setItem('accessToken', data.tokens.accessToken);
          localStorage.setItem('refreshToken', data.tokens.refreshToken);
        }
        
        // Check if registration requires verification
        if (data.requiresVerification) {
          return { 
            success: true, 
            user: data.user, 
            requiresVerification: true 
          };
        }
        
        setIsAuthenticated(true);
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        console.log('📝 useAuth: Registration failed with message:', data.message);
        setError(data.message);
        return { 
          success: false, 
          error: data.message || 'Registration failed',
          requiresVerification: data.requiresVerification 
        };
      }
    } catch (error) {
      console.error('📝 useAuth: Network error during registration:', error);
      setError('Network error. Please try again.');
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      // Clear local tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Call backend logout (for Google OAuth cookies)
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      setIsAuthenticated(false);
      setUser(null);
      setError(null);
      
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if backend call fails
      setIsAuthenticated(false);
      setUser(null);
      return { success: false, error: error.message };
    }
  }, []);

  // Google OAuth success handler
  const handleGoogleAuthSuccess = useCallback((googleUser) => {
    setIsAuthenticated(true);
    setUser(googleUser);
    setError(null);
  }, []);

  // Check auth status on mount and when localStorage changes
  useEffect(() => {
    checkAuthStatus();
    
    // Listen for storage events (both login and logout)
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken') {
        if (!e.newValue) {
          // Token was removed, logout
          setIsAuthenticated(false);
          setUser(null);
        } else if (e.newValue && !isAuthenticated) {
          // Token was added and we're not authenticated, check auth status
          checkAuthStatus();
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkAuthStatus]);

  return {
    // State
    isAuthenticated,
    user,
    loading,
    error,
    
    // Actions
    login,
    register,
    logout,
    checkAuthStatus,
    refreshToken,
    handleGoogleAuthSuccess,
    
    // Utilities
    hasValidTokens,
    getAuthHeaders,
    authenticatedFetch,
  };
}
