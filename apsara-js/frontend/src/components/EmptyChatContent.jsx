import React from 'react';
import RotatingPrompts from './RotatingPrompts'; // Import the component

// Make this the default export
export default function EmptyChatContent({ allPrompts, onStartChatWithPrompt }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 px-4">
      <h3 className="text-3xl font-bold mb-3 animate-shimmer bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" style={{ animationDuration: '3s' }}>
        Welcome to Apsara 2.5 
      </h3>
      <p className="max-w-lg mb-8 text-base text-gray-600 dark:text-gray-400">
        How can I help you today?
      </p>
      <div className="mb-8 w-full flex justify-center">
        {/* Use the imported component */}
        <RotatingPrompts
          allPrompts={allPrompts}
          onPromptClick={onStartChatWithPrompt}
        />
      </div>
    </div>
  );
}