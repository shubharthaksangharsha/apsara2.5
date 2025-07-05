import React, { useState, useEffect } from 'react';
import PromptButton from './components/PromptButton';
import { ROTATION_INTERVAL_MS, PROMPTS_TO_SHOW, FADE_OUT_DURATION_MS } from './constants';

/**
 * Component that displays rotating prompt suggestions
 * 
 * @param {Object} props - Component props
 * @param {Array} props.allPrompts - Full array of available prompts
 * @param {Function} props.onPromptClick - Handler for when a prompt is clicked
 * @returns {JSX.Element|null} RotatingPrompts component or null if no prompts
 */
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
            
            // Ensure we don't show the exact same set twice
            if (allPrompts.length > PROMPTS_TO_SHOW && 
                potentialNext.map(p => p.text).join('') === currentVisibleTexts.join('')) {
                 const reshuffledAll = [...allPrompts].sort(() => 0.5 - Math.random());
                 potentialNext = reshuffledAll.slice(0, PROMPTS_TO_SHOW);
            }
            nextPrompts = potentialNext;
        }

        setVisiblePrompts(nextPrompts);
        setIsFading(false); // Trigger fade in
      }, FADE_OUT_DURATION_MS);

    }, ROTATION_INTERVAL_MS);

    return () => {
      clearInterval(intervalId); // Cleanup on unmount
    };
  }, [allPrompts]); // Re-run if the list of all prompts changes

  if (!allPrompts || allPrompts.length === 0) {
    return null; // Don't render if no prompts
  }

  return (
    <div className="w-full max-w-xs sm:max-w-md md:max-w-xl">
      <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 sm:mb-4">Try asking:</p>
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 transition-opacity duration-300 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
        {visiblePrompts.map((prompt, index) => (
          <PromptButton 
            key={`${prompt.text}-${index}`}
            prompt={prompt}
            onClick={onPromptClick}
          />
        ))}
      </div>
    </div>
  );
} 