import React from 'react';
import RotatingPrompts from './RotatingPrompts';
import { MessageSquare, Mail, LogIn, SkipForward } from 'lucide-react';

export default function WelcomeScreen({ 
  allPrompts, 
  onStartNewChat, 
  onStartChatWithPrompt, 
  isAuthenticated, 
  userProfile, 
  onGoogleSignIn, 
  onSkipAuth,
  authSkipped
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 px-3 sm:px-4 py-6 sm:py-8">
      <div className="mb-3 sm:mb-4">
        {/* Optional: Add an icon or logo here */}
      </div>
      <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3 animate-shimmer bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" style={{ animationDuration: '3s' }}>
        Welcome to Apsara 2.5
      </h3>
      
      {isAuthenticated ? (
        // Show welcome message when authenticated
        <div className="mb-4 flex flex-col items-center">
          <p className="max-w-xs sm:max-w-md md:max-w-lg mb-4 text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
            Hello, {userProfile?.name || 'User'}! Your Google account is connected.
            Start a new chat or select one from the sidebar.
          </p>
          
          {/* Authenticated indicator */}
          <div className="flex items-center justify-center mb-4 py-2 px-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-xs">
            <Mail className="h-4 w-4 mr-2" />
            <span>Google tools are enabled</span>
          </div>
        </div>
      ) : authSkipped ? (
        // Show standard message when auth was skipped
        <div className="mb-4">
          <p className="max-w-xs sm:max-w-md md:max-w-lg mb-4 text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
            Your intelligent assistant. Start a new chat or select one from the sidebar.
          </p>
          
          {/* Limited functionality indicator */}
          <div className="flex items-center justify-center mb-4 py-2 px-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-md text-xs">
            <Mail className="h-4 w-4 mr-2" />
            <span>Google tools are disabled</span>
          </div>
          
          {/* Sign-in option */}
          <button 
            onClick={onGoogleSignIn} 
            className="flex items-center justify-center px-3 py-1.5 mb-4 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs"
          >
            <Mail className="h-3.5 w-3.5 mr-2" />
            <span>Sign in with Google</span>
          </button>
        </div>
      ) : (
        // Show auth options when not authenticated and not skipped
        <div className="mb-4 flex flex-col items-center">
          <p className="max-w-xs sm:max-w-md md:max-w-lg mb-4 text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
            Sign in with Google to enable Gmail, Calendar, and Maps functionality.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Google Sign-in Button */}
            <button 
              onClick={onGoogleSignIn} 
              className="flex items-center justify-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm shadow-sm"
            >
              <Mail className="h-5 w-5 mr-2" />
              <span>Sign in with Google</span>
            </button>
            
            {/* Skip Authentication Button */}
            <button 
              onClick={onSkipAuth} 
              className="flex items-center justify-center px-4 py-2 bg-transparent border border-gray-300 dark:border-gray-700 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
            >
              <SkipForward className="h-5 w-5 mr-2" />
              <span>Skip</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Show RotatingPrompts and Start New Chat button only if authenticated or auth skipped */}
      {(isAuthenticated || authSkipped) && (
        <>
          {/* Use the RotatingPrompts component */}
          <div className="mb-5 sm:mb-6 w-full flex justify-center px-1 sm:px-2">
            <RotatingPrompts
              allPrompts={allPrompts}
              onPromptClick={onStartChatWithPrompt}
            />
          </div>

          {/* Start New Chat Button */}
          <button
            className="px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 ease-in-out group shadow-md hover:shadow-lg transform hover:scale-105 text-xs sm:text-sm md:text-base"
            onClick={onStartNewChat}
          >
            <span className="font-semibold">Start New Chat</span>
          </button>
        </>
      )}
    </div>
  );
}