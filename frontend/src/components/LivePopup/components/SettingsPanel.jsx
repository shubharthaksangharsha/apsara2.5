import React from 'react';
import { MEDIA_RESOLUTIONS } from '../constants';

/**
 * Settings panel component for live session settings
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the panel is open
 * @param {Array} props.voices - Available voice options
 * @param {string} props.currentVoice - Currently selected voice
 * @param {string} props.liveModality - Current modality setting
 * @param {string} props.liveSystemInstruction - Current system instruction
 * @param {boolean} props.transcriptionEnabled - Whether transcription is enabled
 * @param {boolean} props.slidingWindowEnabled - Whether sliding window is enabled
 * @param {number} props.slidingWindowTokens - Sliding window token limit
 * @param {string} props.nativeAudioFeature - Selected native audio feature
 * @param {string} props.mediaResolution - Selected media resolution
 * @param {Array} props.models - Available models
 * @param {string} props.selectedModel - Currently selected model
 * @param {Function} props.onVoiceChange - Handler for voice changes
 * @param {Function} props.onModalityChange - Handler for modality changes
 * @param {Function} props.onSystemInstructionChange - Handler for system instruction changes
 * @param {Function} props.setTranscriptionEnabled - Handler for transcription setting
 * @param {Function} props.setSlidingWindowEnabled - Handler for sliding window setting
 * @param {Function} props.setSlidingWindowTokens - Handler for sliding window token limit
 * @param {Function} props.onNativeAudioFeatureChange - Handler for native audio feature changes
 * @param {Function} props.onMediaResolutionChange - Handler for media resolution changes
 * @param {Function} props.setSelectedModel - Handler for model selection
 * @returns {JSX.Element|null} SettingsPanel component
 */
const SettingsPanel = ({
  isOpen,
  voices,
  currentVoice,
  liveModality,
  liveSystemInstruction,
  transcriptionEnabled,
  slidingWindowEnabled,
  slidingWindowTokens,
  nativeAudioFeature,
  mediaResolution,
  models,
  selectedModel,
  onVoiceChange,
  onModalityChange,
  onSystemInstructionChange,
  setTranscriptionEnabled,
  setSlidingWindowEnabled,
  setSlidingWindowTokens,
  onNativeAudioFeatureChange,
  onMediaResolutionChange,
  setSelectedModel
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="h-full overflow-y-auto p-3 space-y-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Model Selection */}
      <div className="space-y-1">
        <label htmlFor="modelSelect" className="block text-xs font-medium text-gray-700 dark:text-gray-300">Model</label>
        <select
          id="modelSelect"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full p-1.5 text-xs border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500"
        >
          {models.map(model => (
            <option key={model.id} value={model.id}>{model.name}</option>
          ))}
        </select>
      </div>
      
      {/* Modality Selection */}
      <div className="space-y-1">
        <label htmlFor="modalitySelect" className="block text-xs font-medium text-gray-700 dark:text-gray-300">Modality</label>
        <select
          id="modalitySelect"
          value={liveModality}
          onChange={(e) => onModalityChange(e.target.value)}
          className="w-full p-1.5 text-xs border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="TEXT">Text Only</option>
          <option value="AUDIO">Audio Only</option>
          <option value="AUDIO_TEXT">Audio + Text</option>
        </select>
      </div>
      
      {/* Voice Selection - Only show when modality includes audio */}
      {(liveModality === 'AUDIO' || liveModality === 'AUDIO_TEXT') && (
        <div className="space-y-1">
          <label htmlFor="voiceSelect" className="block text-xs font-medium text-gray-700 dark:text-gray-300">Voice</label>
          <select
            id="voiceSelect"
            value={currentVoice}
            onChange={(e) => onVoiceChange(e.target.value)}
            className="w-full p-1.5 text-xs border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500"
          >
            {voices.map(voice => (
              <option key={voice.id} value={voice.id}>{voice.name}</option>
            ))}
          </select>
        </div>
      )}
      
      {/* System Instruction */}
      <div className="space-y-1">
        <label htmlFor="systemInstruction" className="block text-xs font-medium text-gray-700 dark:text-gray-300">System Instruction</label>
        <textarea
          id="systemInstruction"
          value={liveSystemInstruction}
          onChange={(e) => onSystemInstructionChange(e.target.value)}
          rows={3}
          className="w-full p-1.5 text-xs border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500"
        ></textarea>
      </div>
      
      {/* Audio Transcription Toggle */}
      <div className="flex items-center justify-between">
        <label htmlFor="transcriptionToggle" className="text-xs font-medium text-gray-700 dark:text-gray-300">Enable Transcription</label>
        <div className="relative inline-block w-10 align-middle select-none">
          <input
            type="checkbox"
            id="transcriptionToggle"
            checked={transcriptionEnabled}
            onChange={(e) => setTranscriptionEnabled(e.target.checked)}
            className="sr-only"
          />
          <div className={`block h-5 rounded-full ${transcriptionEnabled ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'} w-10`}></div>
          <div className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transform transition-transform ${transcriptionEnabled ? 'translate-x-5' : ''}`}></div>
        </div>
      </div>
      
      {/* Sliding Window Toggle */}
      <div className="flex items-center justify-between">
        <label htmlFor="slidingWindowToggle" className="text-xs font-medium text-gray-700 dark:text-gray-300">Enable Sliding Window</label>
        <div className="relative inline-block w-10 align-middle select-none">
          <input
            type="checkbox"
            id="slidingWindowToggle"
            checked={slidingWindowEnabled}
            onChange={(e) => setSlidingWindowEnabled(e.target.checked)}
            className="sr-only"
          />
          <div className={`block h-5 rounded-full ${slidingWindowEnabled ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'} w-10`}></div>
          <div className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transform transition-transform ${slidingWindowEnabled ? 'translate-x-5' : ''}`}></div>
        </div>
      </div>
      
      {/* Sliding Window Tokens - Only show when sliding window is enabled */}
      {slidingWindowEnabled && (
        <div className="space-y-1">
          <label htmlFor="slidingWindowTokens" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Sliding Window Tokens: {slidingWindowTokens}
          </label>
          <input
            type="range"
            id="slidingWindowTokens"
            min={1000}
            max={8000}
            step={500}
            value={slidingWindowTokens}
            onChange={(e) => setSlidingWindowTokens(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      )}
      
      {/* Native Audio Feature Selection */}
      <div className="space-y-1">
        <label htmlFor="nativeAudioFeature" className="block text-xs font-medium text-gray-700 dark:text-gray-300">Native Audio Feature</label>
        <select
          id="nativeAudioFeature"
          value={nativeAudioFeature}
          onChange={(e) => onNativeAudioFeatureChange(e.target.value)}
          className="w-full p-1.5 text-xs border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="none">None</option>
          <option value="affectiveDialog">Affective Dialog</option>
          <option value="proactiveAudio">Proactive Audio</option>
        </select>
      </div>
      
      {/* Media Resolution Selection */}
      <div className="space-y-1">
        <label htmlFor="mediaResolution" className="block text-xs font-medium text-gray-700 dark:text-gray-300">Media Resolution</label>
        <select
          id="mediaResolution"
          value={mediaResolution}
          onChange={(e) => onMediaResolutionChange(e.target.value)}
          className="w-full p-1.5 text-xs border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500"
        >
          {MEDIA_RESOLUTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default SettingsPanel;