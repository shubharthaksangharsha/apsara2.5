import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';

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

  // Fetch models from API on component mount
  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true);
        // Use fallback models to avoid API issues during development
        setModels(FALLBACK_MODELS);
        
        // Uncomment this when API is ready
        /*
        const response = await fetch('/api/models/live');
        if (!response.ok) {
          throw new Error('Failed to load models');
        }
        const data = await response.json();
        setModels(data);
        */
      } catch (err) {
        console.error('Error fetching models:', err);
        setError(err.message);
        setModels(FALLBACK_MODELS); // Use fallback models if API fails
      } finally {
        setLoading(false);
      }
    }
    
    fetchModels();
  }, []);

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

  // No tooltip handlers needed

  return (
    <div className="w-full">
      <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Model
      </label>
      
      <div className="relative">
        {loading ? (
          <div className="flex items-center justify-center py-2 text-gray-500">
            <Loader className="w-4 h-4 mr-2 animate-spin" />
            <span>Loading models...</span>
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm py-1">{error}</div>
        ) : (
          <div className="relative w-full">
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:text-gray-300 disabled:opacity-60 disabled:cursor-not-allowed appearance-none"
            >
              {models.map(model => (
                <option key={model.id} value={model.id} title={model.description}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

// Export the fallback model list for use in other components
export { FALLBACK_MODELS as LIVE_MODELS };
