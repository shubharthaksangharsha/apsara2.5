// Constants for the ModelSelector component

// Fallback models in case API request fails
export const FALLBACK_MODELS = [
  {
    id: 'gemini-2.0-flash-live-001',
    name: 'Gemini 2.0 Flash Live',
    description: 'Original live model with cascaded audio processing',
    features: ['Tool use (Search, Functions, Code)', 'Lower quality audio', 'Longer context window'],
    isDefault: true
  },
  {
    id: 'gemini-2.5-flash-preview-native-audio-dialog',
    name: 'Gemini 2.5 Native Audio',
    description: 'Improved model with native audio generation',
    features: ['Higher quality audio', 'More natural sounding voices', 'Better expression and tone', 'Limited tool support (Search, Functions)'],
    isDefault: false
  },
  {
    id: 'gemini-2.5-flash-exp-native-audio-thinking-dialog',
    name: 'Gemini 2.5 Native Audio + Thinking',
    description: 'Experimental model with thinking capabilities and native audio',
    features: ['Thinking capabilities', 'Higher quality audio', 'More expressive responses', 'Limited tool support (Search only)'],
    isDefault: false
  }
];

// Helper functions to determine model capabilities
export function modelSupportsNativeAudio(modelId) {
  return modelId?.includes('native-audio') || false;
}

export function modelSupportsThinking(modelId) {
  return modelId?.includes('thinking') || false;
}

export function getModelCapabilities(modelId) {
  return {
    nativeAudio: modelSupportsNativeAudio(modelId),
    thinking: modelSupportsThinking(modelId),
    toolUse: !modelId?.includes('thinking') // Only thinking models have limited tool support
  };
}

// For backwards compatibility
export { FALLBACK_MODELS as LIVE_MODELS }; 