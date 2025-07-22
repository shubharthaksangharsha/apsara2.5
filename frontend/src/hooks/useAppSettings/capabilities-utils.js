/**
 * Utilities for handling model capabilities
 */

// Import from the main project utils
import { getModelCapabilities } from '../../utils/modelCapabilities';

/**
 * Updates settings based on model capabilities
 * 
 * @param {string} modelId - Current model ID
 * @param {Object} capabilities - Model capabilities
 * @param {Object} state - Current state values
 * @param {Object} setters - State setters
 * @param {Object} storage - Values from localStorage
 */
export const updateSettingsBasedOnCapabilities = (
  modelId,
  capabilities = null,
  state = {},
  setters = {},
  storage = {}
) => {
  const modelCapabilities = capabilities || getModelCapabilities(modelId);
  
  // Reset tool selection flags when model changes
  // Only allow tools that are supported by the current model
  if (!modelCapabilities.supportsSearch) {
    setters.setEnableGoogleSearch?.(false);
  }
  
  if (!modelCapabilities.supportsCodeExecution) {
    setters.setEnableCodeExecution?.(false);
  }

  // Default thinking settings based on model, then check localStorage for overrides
  let modelDefaultThinking = false;
  let modelDefaultBudget = 0;

  if (modelId === 'gemini-2.5-pro-exp-03-25' || modelId === 'gemini-2.5-flash-preview-04-17' || modelId === 'gemini-2.5-flash-preview-05-20' || modelId === 'gemini-2.5-flash' || modelId === 'gemini-2.5-pro') {
    modelDefaultThinking = true;
    if (modelId === 'gemini-2.5-flash-preview-04-17' || modelId === 'gemini-2.5-flash-preview-05-20' || modelId === 'gemini-2.5-flash' || modelId === 'gemini-2.5-pro') {
      modelDefaultBudget = 100;
    }
  }

  const savedThinking = storage.enableThinking;
  const savedThinkingBudget = storage.thinkingBudget;

  if (modelCapabilities.supportsThinking) {
    // If localStorage has a value, use it; otherwise, use model default
    setters.setEnableThinking?.(
      savedThinking !== null ? savedThinking === 'true' : modelDefaultThinking
    );
  } else {
    setters.setEnableThinking?.(false);
  }

  if (modelCapabilities.supportsThinkingBudget) {
    // If localStorage has a value, use it; otherwise, use model default
    setters.setThinkingBudget?.(
      savedThinkingBudget !== null ? parseInt(savedThinkingBudget, 10) : modelDefaultBudget
    );
  } else {
    setters.setThinkingBudget?.(0); // Reset to 0 if not supported
  }
  
  return modelCapabilities;
}; 