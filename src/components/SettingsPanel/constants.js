/**
 * Constants for the SettingsPanel component
 */

// Animation durations
export const ANIMATION_DURATION = 300; // ms

// Default values
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_OUTPUT_TOKENS = 1024;
export const DEFAULT_THINKING_BUDGET = 1000;

// Range limits
export const TEMPERATURE_MIN = 0;
export const TEMPERATURE_MAX = 1;
export const TEMPERATURE_STEP = 0.1;

export const MAX_OUTPUT_TOKENS_MIN = 1;
export const MAX_OUTPUT_TOKENS_MAX = 8192;

export const THINKING_BUDGET_MIN = 0;
export const THINKING_BUDGET_MAX = 2000;
export const THINKING_BUDGET_STEP = 5;

// Mobile breakpoint (matches with Tailwind sm breakpoint)
export const MOBILE_BREAKPOINT = 640; // px 