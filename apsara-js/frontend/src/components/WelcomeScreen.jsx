import React from 'react';
import { BrainCircuit, BookOpen, ImageIcon } from 'lucide-react'; // Add needed icons

// Define suggested prompts locally or pass them as a prop
const suggestedPrompts = [
  { text: "Explain quantum computing simply", icon: BrainCircuit },
  { text: "Write a Python script for web scraping", icon: BrainCircuit, modelId: "gemini-2.5-pro-exp-03-25" }, 
  { text: "Create a recipe for vegan lasagna", icon: BookOpen },
  { text: "Generate an image of a futuristic cityscape at sunset", icon: ImageIcon, modelId: "gemini-2.0-flash-exp-image-generation" },
  // Add more if desired
];

export default function WelcomeScreen({ onStartNewChat, onStartChatWithPrompt }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 px-4">
      <div className="mb-4"> {/* Adjust spacing */}
        {/* Optional: Add an icon or logo here */}
        {/* <BellRing className="h-10 w-10 text-indigo-500 dark:text-indigo-400" /> */}
      </div>
      <h3 className="text-3xl font-bold mb-3 animate-shimmer bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" style={{ animationDuration: '3s' }}>
        Welcome to Apsara 2.5
      </h3>
      <p className="max-w-lg mb-8 text-base text-gray-600 dark:text-gray-400">
        Your intelligent assistant. Start a new chat or select one from the sidebar.
      </p>
      
      {/* Suggested Prompts */}
      <div className="mb-8 w-full max-w-xl">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Try asking:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestedPrompts.slice(0, 4).map((prompt, index) => { // Show first 4
            const Icon = prompt.icon || BrainCircuit; 
            return (
              <button 
                key={index}
                onClick={() => onStartChatWithPrompt(prompt.text, prompt.modelId)}
                className="flex items-center text-left px-4 py-3 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/80 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-all shadow-sm hover:shadow-lg transform hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-700 group"
              >
                <Icon className="h-5 w-5 mr-3 text-indigo-500 dark:text-indigo-400 flex-shrink-0 transition-transform group-hover:scale-110" />
                {/* Show only the first line of the prompt text for brevity */}
                <span className="flex-1">{prompt.text.split('\n')[0]}</span> 
              </button>
            );
          })}
        </div>
      </div>

      {/* Start New Chat Button */}
      <button
        className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 ease-in-out group shadow-md hover:shadow-lg transform hover:scale-105"
        onClick={onStartNewChat}
      >
        <span className="font-semibold">Start New Chat</span>
      </button>
    </div>
  );
}