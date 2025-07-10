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
 * @param {number} temperature - Model temperature
 * @param {number} maxOutputTokens - Maximum output tokens
 * @param {boolean} enableGoogleSearch - Whether Google Search is enabled
 * @param {boolean} enableCodeExecution - Whether Code Execution is enabled
 * @param {string} systemInstruction - System instruction text
 * @param {boolean} isSystemInstructionApplicable - Whether system instruction is applicable
 * @param {boolean} enableThinking - Whether thinking is enabled
 * @param {number} thinkingBudget - Thinking budget
 * @param {boolean} enableFunctionCalling - Whether function calling is enabled
 * @param {Array} selectedTools - Array of selected tool names
 * @param {string} functionCallingMode - Function calling mode (AUTO, ANY, NONE)
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
  thinkingBudget,
  enableFunctionCalling = false,
  selectedTools = [],
  functionCallingMode = 'AUTO'
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

  // Tool configuration - Check overrides first, then function calling, then fallback to search/code exec
  if (!isImageGenCall) {
    if (useSearch) {
      // Priority 1: Google Search - If enabled, this MUST be the only tool
      config.tools = [{ googleSearch: {} }];
      console.log("[applyConfigSettings] Adding Google Search tool");
    } else if (useCodeExec) {
      // Priority 2: Code Execution - If enabled (and search is off), this is the only tool
      config.tools = [{ codeExecution: {} }];
      console.log("[applyConfigSettings] Adding Code Execution tool");
    } else if (enableFunctionCalling && selectedTools && selectedTools.length > 0) {
      // Priority 3: Function Calling with selected tools
      config.enableFunctionCalling = true;
      config.selectedTools = selectedTools;
      
      // Add function calling mode configuration from user settings
      config.functionCallingMode = functionCallingMode;
      
      // For ANY mode, restrict to selected tools only
      if (functionCallingMode === 'ANY') {
        config.allowedFunctionNames = selectedTools;
      }
      
      console.log("[applyConfigSettings] Adding Function Calling with tools:", selectedTools);
      console.log("[applyConfigSettings] Function calling mode:", config.functionCallingMode);
      // Don't set config.tools here as function calling tools are handled differently by the backend
    } else {
      // No tools selected - leave tools as empty array
      console.log("[applyConfigSettings] No tools selected");
    }
  }

  // Add thinkingConfig based on enableThinking and thinkingBudget
  if (typeof enableThinking === 'boolean') { // Check if enableThinking is explicitly set
    if (enableThinking) {
      config.thinkingConfig = { includeThoughts: true };
      
      // Handle thinkingBudget - explicitly check for -1 for dynamic thinking
      if (typeof thinkingBudget === 'number') {
        if (thinkingBudget === -1) {
          // Dynamic thinking mode
          config.thinkingConfig.thinkingBudget = -1;
          console.log("[applyConfigSettings] Using dynamic thinking mode (thinkingBudget: -1)");
        } else if (thinkingBudget >= 0) {
          // Fixed budget
          config.thinkingConfig.thinkingBudget = thinkingBudget;
          console.log("[applyConfigSettings] Using fixed thinking budget:", thinkingBudget);
        }
      }
    } else {
      // If thinking is explicitly disabled, send includeThoughts: false
      config.thinkingConfig = { includeThoughts: false };
      console.log("[applyConfigSettings] Thinking disabled");
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