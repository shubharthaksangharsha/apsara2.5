import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, Info } from 'lucide-react';

// Fallback models in case API request fails
const FALLBACK_MODELS = [
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

export default function ModelSelector({ selectedModel, onSelectModel, disabled = false }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Fetch models from API on component mount
  useEffect(() => {
    async function fetchModels() {
      try {
        // Don't refetch too frequently (limit to once every 30 seconds)
        const now = Date.now();
        if (now - lastFetchTime < 30000 && models.length > 0) {
          console.log('[ModelSelector] Using recently fetched models');
          return;
        }
        
        setLoading(true);
        setError(null);
        
        console.log('[ModelSelector] Fetching models from API...');
        // We can use either direct endpoint due to proxy config in vite.config.js
        const apiUrl = '/models/live';
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[ModelSelector] API error (${response.status}):`, errorText);
          throw new Error(`Failed to load models: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[ModelSelector] Fetched models:', data);
        
        if (Array.isArray(data) && data.length > 0) {
          setModels(data);
          setLastFetchTime(now);
        } else {
          console.warn('[ModelSelector] API returned empty or invalid models, using fallbacks');
          setModels(FALLBACK_MODELS);
        }
      } catch (err) {
        console.error('[ModelSelector] Error fetching models:', err);
        setError(err.message);
        // Use fallback models if API fails
        if (models.length === 0) {
          console.log('[ModelSelector] Using fallback models');
          setModels(FALLBACK_MODELS);
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchModels();
    
    // Set up periodic refresh (every 5 minutes)
    const refreshInterval = setInterval(fetchModels, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [lastFetchTime, models.length]);

  // Find current model details
  const currentModel = models.find(m => m.id === selectedModel) || 
                      FALLBACK_MODELS.find(m => m.id === selectedModel) || 
                      FALLBACK_MODELS[0];

  // Set a default model if none is selected
  useEffect(() => {
    if (models.length > 0 && (!selectedModel || !models.some(m => m.id === selectedModel))) {
      const defaultModel = models.find(m => m.isDefault) || models[0];
      onSelectModel(defaultModel.id);
    }
  }, [models, selectedModel, onSelectModel]);

  // Setup tooltip handling
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Function to show tooltip with model info
  const handleModelInfoClick = (e, model) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Toggle tooltip if clicking on the same model
    if (showTooltip) {
      setShowTooltip(false);
      return;
    }
    
    // Get position relative to viewport
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    
    // Calculate position (handle edge cases near screen edges)
    const posX = rect.right + 10 > viewportWidth - 200 ? rect.left - 220 : rect.right + 10;
    
    setTooltipPosition({
      x: posX,
      y: rect.top - 10
    });
    
    // Format features list for tooltip
    const featuresHtml = model.features.map(f => `• ${f}`).join('<br>');
    setTooltipContent(`
      <div class="font-medium mb-1">${model.name}</div>
      <div class="text-xs mb-2">${model.description}</div>
      <div class="text-xs">${featuresHtml}</div>
    `);
    
    setShowTooltip(true);
    
    // Log for debugging
    console.log('[ModelSelector] Showing tooltip for', model.name);
  };
  
  // Handle clicks outside tooltip to close it
  useEffect(() => {
    if (!showTooltip) return;
    
    const handleClickOutside = (e) => {
      // Don't close if clicking the info button itself (it has its own handler)
      if (e.target.closest('button[title="View model details"]')) return;
      setShowTooltip(false);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showTooltip]);

  // Determine if current model supports native audio
  const supportsNativeAudio = currentModel?.id?.includes('native-audio') || false;
  
  // Determine if current model supports thinking capabilities
  const supportsThinking = currentModel?.id?.includes('thinking') || false;

  return (
    <div className="w-full">
      <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Model
        {currentModel && (
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
        )}
      </label>
      
      <div className="relative">
        {loading ? (
          <div className="flex items-center justify-center py-2 text-gray-500">
            <Loader className="w-4 h-4 mr-2 animate-spin" />
            <span>Loading models...</span>
          </div>
        ) : error ? (
          <div className="flex items-center text-red-500 text-sm py-1">
            <AlertCircle className="w-4 h-4 mr-1" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="relative w-full">
            <div className="relative flex">
              <select
                value={selectedModel}
                onChange={(e) => onSelectModel(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:text-gray-300 disabled:opacity-60 disabled:cursor-not-allowed appearance-none"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              
              {currentModel && (
                <button 
                  onClick={(e) => handleModelInfoClick(e, currentModel)}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="View model details"
                >
                  <Info className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Description of current model */}
            {currentModel && !showTooltip && (
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {currentModel.description}
              </div>
            )}
            
            {/* Tooltip for model details */}
            {showTooltip && (
              <div 
                className="fixed z-50 bg-white dark:bg-gray-800 shadow-xl rounded-md p-4 border border-gray-200 dark:border-gray-700 w-64"
                style={{
                  top: `${tooltipPosition.y}px`,
                  left: `${tooltipPosition.x}px`,
                  animation: 'fadeIn 0.2s ease-in-out'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute right-2 top-2 cursor-pointer text-gray-400 hover:text-gray-600"
                     onClick={() => setShowTooltip(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </div>
                <div dangerouslySetInnerHTML={{ __html: tooltipContent }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Export the fallback model list for use in other components
export { FALLBACK_MODELS as LIVE_MODELS };

// Export helper functions to determine model capabilities
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
