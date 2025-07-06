import React from 'react';
import { MessageSquare, Mail, LogIn, SkipForward } from 'lucide-react';

import RotatingPrompts from '../RotatingPrompts';
import { ANIMATION_DURATION, TEXT_SIZES, BUTTON_VARIANTS, STATUS_INDICATOR_VARIANTS } from './constants';

/**
 * WelcomeScreen component shown when no chat is active
 * 
 * @param {Object} props - Component props
 * @param {Array} props.allPrompts - List of suggested prompts to display
 * @param {Function} props.onStartNewChat - Handler for starting a new chat
 * @param {Function} props.onStartChatWithPrompt - Handler for starting a chat with a specific prompt
 * @param {boolean} props.isAuthenticated - Whether the user is authenticated
 * @param {Object} props.userProfile - User profile information if authenticated
 * @param {Function} props.onGoogleSignIn - Handler for Google sign-in
 * @param {Function} props.onSkipAuth - Handler for skipping authentication
 * @param {boolean} props.authSkipped - Whether authentication was skipped
 * @returns {JSX.Element} WelcomeScreen component
 */
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
      <h3 
        className={`${TEXT_SIZES.HEADING} font-bold mb-2 sm:mb-3 animate-shimmer bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500`} 
        style={{ animationDuration: ANIMATION_DURATION }}
      >
        Welcome to Apsara 2.5
      </h3>
      
      {isAuthenticated ? (
        // Show welcome message when authenticated
        <div className="mb-4 flex flex-col items-center">
          <p className={`max-w-xs sm:max-w-md md:max-w-lg mb-4 ${TEXT_SIZES.SMALL} text-gray-600 dark:text-gray-400`}>
            Hello, {userProfile?.name || 'User'}! Your Google account is connected.
            Start a new chat or select one from the sidebar.
          </p>
          
          {/* Authenticated indicator */}
          <div className={STATUS_INDICATOR_VARIANTS.SUCCESS}>
            <Mail className="h-4 w-4 mr-2" />
            <span>Google tools are enabled</span>
          </div>
        </div>
      ) : authSkipped ? (
        // Show standard message when auth was skipped
        <div className="mb-4">
          <p className={`max-w-xs sm:max-w-md md:max-w-lg mb-4 ${TEXT_SIZES.SMALL} text-gray-600 dark:text-gray-400`}>
            Your intelligent assistant. Start a new chat or select one from the sidebar.
          </p>
          
          {/* Limited functionality indicator */}
          <div className={STATUS_INDICATOR_VARIANTS.WARNING}>
            <Mail className="h-4 w-4 mr-2" />
            <span>Google tools are disabled</span>
          </div>
          
          {/* Sign-in option */}
          <button 
            onClick={onGoogleSignIn}
            className={BUTTON_VARIANTS.LINK}
          >
            <Mail className="h-3.5 w-3.5 mr-2" />
            <span>Sign in with Google</span>
          </button>
        </div>
      ) : (
        // Show auth options when not authenticated and not skipped
        <div className="mb-4 flex flex-col items-center">
          <p className={`max-w-xs sm:max-w-md md:max-w-lg mb-4 ${TEXT_SIZES.SMALL} text-gray-600 dark:text-gray-400`}>
            Sign in with Google to enable Gmail, Calendar, and Maps functionality.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Google Sign-in Button */}
            <button 
              onClick={onGoogleSignIn}
              className={BUTTON_VARIANTS.SECONDARY}
            >
              <Mail className="h-5 w-5 mr-2" />
              <span>Sign in with Google</span>
            </button>
            
            {/* Skip Authentication Button */}
            <button 
              onClick={onSkipAuth} 
              className={BUTTON_VARIANTS.TERTIARY}
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
            className={BUTTON_VARIANTS.PRIMARY}
            onClick={onStartNewChat}
          >
            <span className="font-semibold">Start New Chat</span>
          </button>
        </>
      )}
    </div>
  );
} 