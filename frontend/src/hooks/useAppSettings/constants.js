/**
 * Constants for app settings
 */

export const BACKEND_URL = 'http://localhost:9000'; // Consider moving to a config file

// Default values
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_OUTPUT_TOKENS = 8192; // Default to 8k often safer
export const DEFAULT_THINKING_ENABLED = false;
export const DEFAULT_THINKING_BUDGET = 0;

// LocalStorage keys
export const LS_KEYS = {
  CURRENT_MODEL: 'currentModel',
  CURRENT_VOICE: 'currentVoice',
  TEMPERATURE: 'temperature',
  MAX_OUTPUT_TOKENS: 'maxOutputTokens',
  ENABLE_THINKING: 'enableThinking',
  THINKING_BUDGET: 'thinkingBudget'
}; 