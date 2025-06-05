// services/ai.js
import { GoogleGenAI } from '@google/genai';
import { getModelToolCapabilities } from '../config/ai.js';
import { getToolDeclarations } from './tools/index.js';

// Cache for models with TTL
let liveModelsCache = {
  models: null,
  timestamp: 0,
  ttl: 10 * 60 * 1000 // 10 minutes cache TTL
};

// Initialize Gemini AI client
export const initializeAI = (apiKey) => {
  return new GoogleGenAI({ apiKey });
};

// Function to fetch models from Google Gemini API
export async function fetchLiveModels(defaultModels) {
  try {
    // Check if we have a valid cache
    const now = Date.now();
    if (liveModelsCache.models && (now - liveModelsCache.timestamp < liveModelsCache.ttl)) {
      console.log('[Models] Returning cached live models');
      return liveModelsCache.models;
    }
    
    // Simplified implementation for stability
    // TODO: Replace with actual API call when endpoint is available
    // Would be something like:
    // const response = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + process.env.GEMINI_API_KEY);
    // const data = await response.json();
    // const liveModels = data.models.filter(model => model.name.includes('live'));
    
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Cache the models
    liveModelsCache.models = defaultModels;
    liveModelsCache.timestamp = now;
    
    return defaultModels;
  } catch (error) {
    console.error('[Models] Error fetching live models:', error);
    // Always return fallback models on error
    return defaultModels;
  }
}

// Helper function to build live connection config
export function buildLiveConnectionConfig({
  requestedModel,
  requestedModality,
  requestedVoice,
  requestedSystemInstruction,
  isAuthenticated,
  userTokens,
  slidingWindowEnabled,
  slidingWindowTokens,
  transcriptionEnabled,
  mediaResolution,
  requestedResumeHandle,
  requestedRealtimeConfig = {},
  getDefaultSystemInstruction
}) {
  // Get capabilities for the selected model
  const capabilities = getModelToolCapabilities(requestedModel);
  
  // Build tools array based on model capabilities
  const toolsArray = [];
  
  // Add Google Search if supported by the model
  if (capabilities.search) {
      toolsArray.push({ googleSearch: {} });
  }
  
  // Add URL Context if supported by the model
  if (capabilities.url) {
      toolsArray.push({urlContext: {}});
  }
  
  // Add Code Execution if supported by the model
  if (capabilities.code) {
      toolsArray.push({ codeExecution: {} });
  }
  
  // Add Function declarations if supported by the model
  if (capabilities.functions) {
      toolsArray.push({ functionDeclarations: getToolDeclarations(isAuthenticated) });
  }
  
  return {
    model: requestedModel,
    responseModalities: [requestedModality],
    ...(requestedModality === 'AUDIO' && requestedVoice && {
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: requestedVoice } }
      }
    }),
    ...(Object.keys(requestedRealtimeConfig).length > 0 && {
      realtimeInputConfig: requestedRealtimeConfig
    }),
    ...(requestedSystemInstruction ? {
      systemInstruction: { 
        role: 'system', 
        parts: [{ text: requestedSystemInstruction }] 
      }
    } : {
      systemInstruction: { 
        role: 'system', 
        parts: [{ text: getDefaultSystemInstruction() }] 
      }
    }),
    // Enable unlimited session with context window compression if enabled
    ...(slidingWindowEnabled && {
      contextWindowCompression: {
        slidingWindow: {},
        triggerTokens: String(slidingWindowTokens)
      }
    }),
    // Enable session resumption (always, or just when handle is provided)
    sessionResumption: {
      handle: requestedResumeHandle || null,
    },
    // enable input and output audio transcription if enabled
    ...(transcriptionEnabled && { outputAudioTranscription: {} }),
    ...(transcriptionEnabled && { inputAudioTranscription: {} }),
    // Use media resolution from URL parameter, fallback to medium if not specified
    mediaResolution: mediaResolution,
    // --- Add Tools Configuration based on model capabilities ---
    tools: toolsArray,
  };
}

// Default models as fallback for when API can't be reached
export const DEFAULT_LIVE_MODELS = [
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