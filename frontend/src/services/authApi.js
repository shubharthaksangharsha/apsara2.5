// services/authApi.js
import { BACKEND_URL } from '../hooks/common-constants';

class AuthAPI {
  constructor() {
    this.baseURL = BACKEND_URL;
  }

  // Get stored token
  getToken() {
    return localStorage.getItem('accessToken');
  }

  // Set token in localStorage
  setTokens(tokens) {
    if (tokens.accessToken) {
      localStorage.setItem('accessToken', tokens.accessToken);
    }
    if (tokens.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
  }

  // Clear tokens
  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Add auth header to requests
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // Register new user
  async register(userData) {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    
    if (data.success && data.tokens) {
      this.setTokens(data.tokens);
    }

    return data;
  }

  // Login user
  async login(credentials) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    
    if (data.success && data.tokens) {
      this.setTokens(data.tokens);
    }

    return data;
  }

  // Logout
  async logout() {
    try {
      await fetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }

  // Check auth status
  async checkAuthStatus() {
    try {
      const response = await fetch(`${this.baseURL}/auth/status`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include', // Include cookies for Google OAuth
      });

      return await response.json();
    } catch (error) {
      console.error('Auth status check error:', error);
      return { isAuthenticated: false };
    }
  }

  // Forgot password
  async forgotPassword(email) {
    const response = await fetch(`${this.baseURL}/auth/forgot-password`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ email }),
    });

    return await response.json();
  }

  // Reset password
  async resetPassword(token, password) {
    const response = await fetch(`${this.baseURL}/auth/reset-password`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ token, password }),
    });

    return await response.json();
  }

  // Refresh token
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();
    
    if (data.success && data.tokens) {
      this.setTokens(data.tokens);
      return data.tokens;
    } else {
      this.clearTokens();
      throw new Error('Token refresh failed');
    }
  }

  // Auto-refresh token when it expires
  async makeAuthenticatedRequest(url, options = {}) {
    try {
      let response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...(options.headers || {}),
        },
      });

      // If unauthorized, try to refresh token
      if (response.status === 401) {
        try {
          await this.refreshToken();
          
          // Retry the original request
          response = await fetch(url, {
            ...options,
            headers: {
              ...this.getHeaders(),
              ...(options.headers || {}),
            },
          });
        } catch (refreshError) {
          // Refresh failed, redirect to login
          this.clearTokens();
          window.location.href = '/';
          throw refreshError;
        }
      }

      return response;
    } catch (error) {
      console.error('Authenticated request error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new AuthAPI();
