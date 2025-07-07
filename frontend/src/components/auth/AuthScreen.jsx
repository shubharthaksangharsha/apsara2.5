// components/auth/AuthScreen.jsx
import React, { useState } from 'react';
import { Eye, EyeOff, User, Mail, Lock, ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import GoogleSignInButton from './GoogleSignInButton';
import { useAuthContext } from '../../contexts/AuthContext';

const AuthScreen = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState(''); // Add success message state
  const [showVerificationMessage, setShowVerificationMessage] = useState(false); // New state for verification
  const [userEmail, setUserEmail] = useState(''); // Store email for verification message
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  // Use the auth context directly
  const { login, register } = useAuthContext();

  // Debug: Log current error state
  console.log('🐛 AuthScreen render - Current error state:', error);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error and success messages when user starts typing
    if (error) setError('');
    if (successMessage) setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      
      if (isLogin) {
        console.log('🔄 Attempting login with:', formData.email);
        result = await login(formData.email, formData.password);
      } else {
        console.log('🔄 Attempting registration with:', formData.name, formData.email);
        result = await register(formData.name, formData.email, formData.password);
      }

      console.log('📥 Auth result:', result);

      if (result.success) {
        console.log('✅ Authentication successful!');
        
        // Check if user needs email verification (for registration)
        if (result.requiresVerification) {
          setUserEmail(formData.email);
          setShowVerificationMessage(true);
          return;
        }
        
        // The useAuth hook handles state updates automatically
        // Optional: call onAuthSuccess callback if provided (for backwards compatibility)
        if (onAuthSuccess && typeof onAuthSuccess === 'function') {
          onAuthSuccess(result.user);
        }
      } else {
        console.log('❌ Authentication failed:', result.error);
        
        // Special handling for unverified email
        if (result.requiresVerification) {
          setUserEmail(formData.email);
          setError('');
          setShowVerificationMessage(true);
          return;
        }
        
        const errorMessage = result.error || 'Authentication failed';
        console.log('🚨 Setting error message:', errorMessage);
        setError(errorMessage);
        console.log('🚨 Error state should now be:', errorMessage);
      }
    } catch (err) {
      console.error('🚨 Network/Auth error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Password reset link sent to your email! Please check your inbox.');
        // Clear the email field after successful request
        setFormData({ ...formData, email: '' });
      } else {
        setError(data.message || 'Failed to send reset email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verification message screen
  if (showVerificationMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6">
                <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Check Your Email
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We've sent a verification link to:
              </p>
              <p className="text-blue-600 dark:text-blue-400 font-semibold mb-6">
                {userEmail}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
                Click the link in the email to verify your account and start using Apsara Assistant.
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/auth/resend-verification', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: userEmail })
                      });
                      const data = await response.json();
                      if (data.success) {
                        setSuccessMessage('Verification email resent! Check your inbox.');
                      } else {
                        setError(data.message);
                      }
                    } catch (err) {
                      setError('Failed to resend email. Please try again.');
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  Resend Verification Email
                </button>
                
                <button
                  onClick={() => {
                    setShowVerificationMessage(false);
                    setUserEmail('');
                    setFormData({ name: '', email: '', password: '' });
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  Back to Login
                </button>
              </div>
              
              {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                  {error}
                </div>
              )}
              
              {successMessage && (
                <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
                  {successMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8">
            <div className="text-center">
              <button
                onClick={() => setShowForgotPassword(false)}
                className="mb-4 inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to login
              </button>
              <div className="mx-auto h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
                Forgot Password?
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form className="mt-8" onSubmit={handleForgotPassword}>
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}
              
              {successMessage && (
                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded-full mr-2 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    {successMessage}
                  </div>
                </div>
              )}

              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || successMessage}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
              >
                {loading ? 'Sending...' : successMessage ? 'Email Sent!' : 'Send Reset Link'}
              </button>

              {successMessage && (
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setSuccessMessage('');
                    setFormData({ name: '', email: '', password: '' });
                  }}
                  className="w-full mt-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  Back to Login
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">🤖</span>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
              {isLogin ? 'Welcome back!' : 'Join Apsara'}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {isLogin 
                ? 'Sign in to your AI assistant' 
                : 'Create your account to get started'
              }
            </p>
            
            {/* Google Benefits Notice */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 <strong>Pro Tip:</strong> Sign in with Google to unlock Gmail & Calendar integration for enhanced productivity!
              </p>
            </div>
          </div>

          {/* Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    required={!isLogin}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Full name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Forgot your password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? <LogIn className="w-5 h-5 mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Google Sign In */}
            <GoogleSignInButton onSuccess={(user) => {
              if (onAuthSuccess && typeof onAuthSuccess === 'function') {
                onAuthSuccess(user);
              }
            }} />

            {/* Switch between login/register */}
            <div className="text-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setFormData({ name: '', email: '', password: '' });
                }}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
