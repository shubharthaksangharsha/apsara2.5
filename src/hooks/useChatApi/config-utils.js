/**
 * Utility functions for configuring API requests
 */

/**
 * Applies configuration settings to a request based on current app settings
 * 
 * @param {Object} config - Base configuration object
 * @param {boolean} isImageGenCall - Whether this is an image generation call
 * @param {boolean|null} overrideEnableSearch - Override for search tool enablement
 * @param {boolean|null} overrideEnableCodeExec - Override for code execution tool enablement
 * @returns {Object} - Configuration with applied settings
 */
export const applyConfigSettings = (
  config = {}, 
  isImageGenCall = false, 
  overrideEnableSearch = null, 
  overrideEnableCodeExec = null,
  temperature,
  maxOutputTokens,
  enableGoogleSearch,
  enableCodeExecution,
  systemInstruction,
  isSystemInstructionApplicable,
  enableThinking,
  thinkingBudget
) => {
  config.generationConfig = config.generationConfig || {};
  config.generationConfig.temperature = temperature;
  config.generationConfig.maxOutputTokens = maxOutputTokens;

  // Determine effective tool state: prioritize overrides, then hook state
  const useSearch = overrideEnableSearch !== null ? overrideEnableSearch : enableGoogleSearch;
  const useCodeExec = overrideEnableCodeExec !== null ? overrideEnableCodeExec : enableCodeExecution;
  console.log("[applyConfigSettings] Effective Tools:", { useSearch, useCodeExec }); // Debug log

  if (!isImageGenCall && isSystemInstructionApplicable) {
    config.systemInstruction = systemInstruction;
  } else {
    delete config.systemInstruction;
  }

  // Initialize tools array - empty by default
  config.tools = [];
  
  // Tell backend to never add default tools
  config.disableDefaultTools = true;
  
  // Only set Google Search flag if actually using search
  if (useSearch) {
    config.enableGoogleSearch = true;
  }

  // Tool configuration - Enforce mutual exclusivity based on priority
  if (!isImageGenCall) {
    if (useSearch) {
      // Priority 1: Google Search - If enabled, this MUST be the only tool
      config.tools = [{ googleSearch: {} }];
      console.log("[applyConfigSettings] Adding Google Search tool");
    } else if (useCodeExec) {
      // Priority 2: Code Execution - If enabled (and search is off), this is the only tool
      config.tools = [{ codeExecution: {} }];
      console.log("[applyConfigSettings] Adding Code Execution tool");
    } else {
      // No tools selected - leave tools as empty array
      console.log("[applyConfigSettings] No tools selected");
    }
  }

  // Add thinkingConfig based on enableThinking and thinkingBudget
  if (typeof enableThinking === 'boolean') { // Check if enableThinking is explicitly set
    if (enableThinking) {
      config.thinkingConfig = { includeThoughts: true };
      // Add thinkingBudget if it's a non-negative number (including 0)
      if (typeof thinkingBudget === 'number' && thinkingBudget >= 0) {
        config.thinkingConfig.thinkingBudget = thinkingBudget;
      }
    } else {
      // If thinking is explicitly disabled, send includeThoughts: false
      config.thinkingConfig = { includeThoughts: false };
    }
  }

  // Remove empty tools array to prevent API issues
  if (!config.tools || config.tools.length === 0) {
    delete config.tools;
    console.log("[applyConfigSettings] Removed empty tools array from request");
  }
  
  if (Object.keys(config.generationConfig).length === 0) {
    delete config.generationConfig;
  }

  return config;
}; 