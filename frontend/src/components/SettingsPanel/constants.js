/**
 * Constants for the SettingsPanel component
 */

// Animation durations
export const ANIMATION_DURATION = 300; // ms

// Default values
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_OUTPUT_TOKENS = 1024;
export const DEFAULT_THINKING_BUDGET = -1; // Changed to -1 for dynamic thinking by default

// Range limits
export const TEMPERATURE_MIN = 0;
export const TEMPERATURE_MAX = 1;
export const TEMPERATURE_STEP = 0.1;

export const MAX_OUTPUT_TOKENS_MIN = 1;
export const MAX_OUTPUT_TOKENS_MAX = 65536; // Updated to match Gemini 2.5 models
export const MAX_OUTPUT_TOKENS_STEP = 1024; // Step size for the slider

export const THINKING_BUDGET_MIN = -1; // Changed to -1 to allow dynamic thinking
export const THINKING_BUDGET_MAX = 32768; // Updated to match Gemini 2.5 Pro max
export const THINKING_BUDGET_STEP = 512; // Increased step size for larger range

// Mobile breakpoint (matches with Tailwind sm breakpoint)
export const MOBILE_BREAKPOINT = 640; // px 