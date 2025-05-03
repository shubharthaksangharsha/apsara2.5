import React, { useState, useEffect } from 'react';
import { BrainCircuit } from 'lucide-react'; // Default icon

const ROTATION_INTERVAL_MS = 5000; // 5 seconds
const PROMPTS_TO_SHOW = 4;

export default function RotatingPrompts({ allPrompts = [], onPromptClick }) {
  const [visiblePrompts, setVisiblePrompts] = useState([]);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (!allPrompts || allPrompts.length === 0) return;

    // Initial selection
    const initialSelection = [...allPrompts].sort(() => 0.5 - Math.random()).slice(0, PROMPTS_TO_SHOW);
    setVisiblePrompts(initialSelection);

    // Interval for rotation
    const intervalId = setInterval(() => {
      setIsFading(true); // Start fade out

      // After fade out duration, update prompts and fade in
      setTimeout(() => {
        const currentVisibleTexts = visiblePrompts.map(p => p.text);
        const availablePrompts = allPrompts.filter(p => !currentVisibleTexts.includes(p.text));

        let nextPrompts;

        if (availablePrompts.length >= PROMPTS_TO_SHOW) {
            // Enough unique prompts available that were not *just* shown
            const shuffledAvailable = [...availablePrompts].sort(() => 0.5 - Math.random());
            nextPrompts = shuffledAvailable.slice(0, PROMPTS_TO_SHOW);
        } else {
            // Not enough unique prompts, must reuse some. Shuffle all and take top N.
            const shuffledAll = [...allPrompts].sort(() => 0.5 - Math.random());
            let potentialNext = shuffledAll.slice(0, PROMPTS_TO_SHOW);
            if (allPrompts.length > PROMPTS_TO_SHOW && potentialNext.map(p => p.text).join('') === currentVisibleTexts.join('')) {
                 const reshuffledAll = [...allPrompts].sort(() => 0.5 - Math.random());
                 potentialNext = reshuffledAll.slice(0, PROMPTS_TO_SHOW);
            }
            nextPrompts = potentialNext;
        }

        setVisiblePrompts(nextPrompts);
        setIsFading(false); // Trigger fade in
      }, 300); // Match fade out duration (adjust if needed)

    }, ROTATION_INTERVAL_MS);

    return () => {
      clearInterval(intervalId); // Cleanup on unmount
    };
  }, [allPrompts]); // Re-run if the list of all prompts changes

  if (!allPrompts || allPrompts.length === 0) {
    return null; // Don't render if no prompts
  }

  return (
    <div className="w-full max-w-xl">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Try asking:</p>
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-opacity duration-300 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
        {visiblePrompts.map((prompt, index) => {
          const Icon = prompt.icon || BrainCircuit;
          return (
            <button
              key={`${prompt.text}-${index}`} // Use text + index for potentially non-unique prompts
              onClick={() => onPromptClick(prompt.text, prompt.modelId)}
              className="flex items-center text-left px-4 py-3 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/80 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-all shadow-sm hover:shadow-lg transform hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-700 group"
            >
              <Icon className="h-5 w-5 mr-3 text-indigo-500 dark:text-indigo-400 flex-shrink-0 transition-transform group-hover:scale-110" />
              <span className="flex-1">{prompt.text.split('\n')[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}