import React from 'react';
import { modelSupportsNativeAudio, modelSupportsThinking } from '../constants';

/**
 * Component that displays badges for model capabilities
 * 
 * @param {Object} props - Component props
 * @param {Object} props.model - The model to display badges for
 * @returns {JSX.Element|null} ModelBadges component
 */
export default function ModelBadges({ model }) {
  if (!model) return null;

  const supportsNativeAudio = modelSupportsNativeAudio(model.id);
  const supportsThinking = modelSupportsThinking(model.id);

  if (!supportsNativeAudio && !supportsThinking) return null;

  return (
    <div className="ml-2 flex space-x-1">
      {supportsNativeAudio && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
          Native Audio
        </span>
      )}
      {supportsThinking && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100">
          Thinking
        </span>
      )}
    </div>
  );
} 