/**
 * Constants for app settings
 */

import { BACKEND_URL } from '../common-constants';

// Re-export BACKEND_URL for backward compatibility
export { BACKEND_URL };

// Default values
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_OUTPUT_TOKENS = 65536; // Updated to match Gemini 2.5 models
export const DEFAULT_THINKING_ENABLED = false;
export const DEFAULT_THINKING_BUDGET = -1; // Changed to -1 for dynamic thinking by default
export const DEFAULT_FUNCTION_CALLING_MODE = 'AUTO';

// Function calling modes
export const FUNCTION_CALLING_MODES = {
  AUTO: 'AUTO',
  ANY: 'ANY', 
  NONE: 'NONE'
};

export const FUNCTION_CALLING_MODE_DESCRIPTIONS = {
  AUTO: 'Model decides when to call functions (recommended)',
  ANY: 'Always tries to call functions when possible',
  NONE: 'Disables function calling completely'
};

// LocalStorage keys
export const LS_KEYS = {
  CURRENT_MODEL: 'currentModel',
  CURRENT_VOICE: 'currentVoice',
  TEMPERATURE: 'temperature',
  MAX_OUTPUT_TOKENS: 'maxOutputTokens',
  ENABLE_THINKING: 'enableThinking',
  THINKING_BUDGET: 'thinkingBudget',
  ENABLE_FUNCTION_CALLING: 'enableFunctionCalling',
  SELECTED_TOOLS: 'selectedTools',
  FUNCTION_CALLING_MODE: 'functionCallingMode'
}; 