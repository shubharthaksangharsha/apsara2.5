// components/auth/EmailVerificationScreen.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const EmailVerificationScreen = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('error');
      setMessage('Invalid verification link');
      setLoading(false);
    }
  }, [token]);

  const verifyEmail = async (verificationToken) => {
    try {
      const response = await fetch(`/api/auth/verify-email/${verificationToken}`);
      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.message);
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8">
          <div className="text-center">
            {loading && (
              <>
                <RefreshCw className="w-16 h-16 mx-auto text-blue-600 animate-spin mb-6" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Verifying Your Email...
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Please wait while we verify your email address.
                </p>
              </>
            )}

            {!loading && status === 'success' && (
              <>
                <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-6" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Email Verified Successfully!
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {message}
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    🎉 Welcome to Apsara! You'll be redirected to the login page shortly.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  Continue to Login
                </button>
              </>
            )}

            {!loading && status === 'error' && (
              <>
                <XCircle className="w-16 h-16 mx-auto text-red-600 mb-6" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Verification Failed
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {message}
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    The verification link may have expired or is invalid. You can request a new verification email from the login page.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  Back to Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationScreen;
