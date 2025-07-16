// Create this new file: frontend/src/utils/modelCapabilities.js

// Helper function to check model capabilities based on the provided list and docs
export const getModelCapabilities = (modelId) => {
  if (!modelId) return { supportsSearch: false, supportsSystemInstruction: true, supportsCodeExecution: false, supportsThinking: false, supportsThinkingBudget: false };

  // Define capabilities based on the user's list and previous documentation
  // Make sure these align with your backend capabilities!
  switch (modelId) {
    case "gemini-2.5-pro-exp-03-25":
      return { supportsSearch: true, supportsSystemInstruction: true, supportsCodeExecution: true, supportsThinking: true, supportsThinkingBudget: false };
    case "gemini-2.5-flash-preview-04-17": // Assuming based on 2.5 family
      return { supportsSearch: true, supportsSystemInstruction: true, supportsCodeExecution: true, supportsThinking: true, supportsThinkingBudget: true };
    case "gemini-2.5-flash-preview-05-20": // Assuming based on 2.5 family
      return { supportsSearch: true, supportsSystemInstruction: true, supportsCodeExecution: true, supportsThinking: true, supportsThinkingBudget: true };
    case "gemini-2.5-flash": // Assuming based on 2.5 family
      return { supportsSearch: true, supportsSystemInstruction: true, supportsCodeExecution: true, supportsThinking: true, supportsThinkingBudget: true };
    case "gemini-2.0-flash": // Assuming based on 2.0 family, added Search based on prompt
      return { supportsSearch: true, supportsSystemInstruction: true, supportsCodeExecution: true, supportsThinking: false, supportsThinkingBudget: false };
    case "gemini-2.0-flash-preview-image-generation": // Image only
      return { supportsSearch: false, supportsSystemInstruction: false, supportsCodeExecution: false, supportsThinking: false, supportsThinkingBudget: false };
    case "imagen-3.0-generate-002": // Image only
      return { supportsSearch: false, supportsSystemInstruction: false, supportsCodeExecution: false, supportsThinking: false, supportsThinkingBudget: false };
    case "gemini-1.5-pro":
      return { supportsSearch: false, supportsSystemInstruction: true, supportsCodeExecution: true, supportsThinking: false, supportsThinkingBudget: false };
    case "gemini-1.5-flash":
    case "gemini-1.5-flash-8b":
      return { supportsSearch: false, supportsSystemInstruction: true, supportsCodeExecution: true, supportsThinking: false, supportsThinkingBudget: false };
    default:
      // Default fallback
      console.warn(`getModelCapabilities: Unknown modelId "${modelId}", using default capabilities.`);
      return { supportsSearch: false, supportsSystemInstruction: true, supportsCodeExecution: false, supportsThinking: false, supportsThinkingBudget: false };
  }
};