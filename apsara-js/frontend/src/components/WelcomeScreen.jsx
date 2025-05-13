import React from 'react';
import RotatingPrompts from './RotatingPrompts'; // Import the new component

export default function WelcomeScreen({ allPrompts, onStartNewChat, onStartChatWithPrompt }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 px-4 py-8 sm:px-6">
      <div className="mb-4"> {/* Adjust spacing */}
        {/* Optional: Add an icon or logo here */}
        {/* <BellRing className="h-10 w-10 text-indigo-500 dark:text-indigo-400" /> */}
      </div>
      <h3 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 animate-shimmer bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" style={{ animationDuration: '3s' }}>
        Welcome to Apsara 2.5
      </h3>
      <p className="max-w-md sm:max-w-lg mb-6 sm:mb-8 text-sm sm:text-base text-gray-600 dark:text-gray-400">
        Your intelligent assistant. Start a new chat or select one from the sidebar.
      </p>
      
      {/* Use the RotatingPrompts component */}
      <div className="mb-6 sm:mb-8 w-full flex justify-center px-2 sm:px-0">
        <RotatingPrompts
           allPrompts={allPrompts}
           onPromptClick={onStartChatWithPrompt}
         />
      </div>

      {/* Start New Chat Button */}
      <button
        className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 ease-in-out group shadow-md hover:shadow-lg transform hover:scale-105 text-sm sm:text-base"
        onClick={onStartNewChat}
      >
        <span className="font-semibold">Start New Chat</span>
      </button>
    </div>
  );
}