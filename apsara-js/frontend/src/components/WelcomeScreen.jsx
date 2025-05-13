import React from 'react';
import RotatingPrompts from './RotatingPrompts'; // Import the new component

export default function WelcomeScreen({ allPrompts, onStartNewChat, onStartChatWithPrompt }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 px-3 sm:px-4 py-6 sm:py-8">
      <div className="mb-3 sm:mb-4">
        {/* Optional: Add an icon or logo here */}
      </div>
      <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3 animate-shimmer bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" style={{ animationDuration: '3s' }}>
        Welcome to Apsara 2.5
      </h3>
      <p className="max-w-xs sm:max-w-md md:max-w-lg mb-4 sm:mb-6 text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
        Your intelligent assistant. Start a new chat or select one from the sidebar.
      </p>
      
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
    </div>
  );
}