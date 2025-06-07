import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, Info } from 'lucide-react';
import ModelBadges from './components/ModelBadges';
import ModelTooltip from './components/ModelTooltip';
import { FALLBACK_MODELS } from './constants';

/**
 * Component for selecting and displaying information about available models
 * 
 * @param {Object} props - Component props
 * @param {string} props.selectedModel - The currently selected model ID
 * @param {Function} props.onSelectModel - Handler for when a model is selected
 * @param {boolean} props.disabled - Whether the component is disabled
 * @returns {JSX.Element} ModelSelector component
 */
export default function ModelSelector({ selectedModel, onSelectModel, disabled = false }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

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

  return (
    <div className="w-full">
      <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Model
        {currentModel && <ModelBadges model={currentModel} />}
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
            {showTooltip && currentModel && (
              <ModelTooltip 
                model={currentModel}
                position={tooltipPosition}
                onClose={() => setShowTooltip(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
} 