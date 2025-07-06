// config/ai.js
import { HarmCategory, HarmBlockThreshold, Modality } from '@google/genai';
import { customToolNames } from '../services/tools/index.js';

// --- Available Models, Voices, Tools ---
export const availableModels = ["gemini-2.0-flash","gemini-2.0-pro","gemini-1.5-flash","gemini-1.5-pro","imagen-3.0-generate-002"];

// --- Chat Models (REST API) ---
export const chatModels = [
  { id: "gemini-2.5-flash-preview-04-17", name: "Gemini 2.5 Flash Preview" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  { id: "gemini-2.0-flash-preview-image-generation", name: "Gemini 2.0 Flash (Image Gen)" },
  { id: "imagen-3.0-generate-002", name: "Imagen 3" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash-8B" },
];

// --- Available Voices ---
export const availableVoices = ['Puck','Charon','Kore','Fenrir','Aoede','Leda','Orus','Zephyr'];

// --- Default Live Models ---  
export const DEFAULT_LIVE_MODELS = [
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

// --- Define model-specific tool capabilities ---
export const MODEL_TOOL_CAPABILITIES = {
  'gemini-2.0-flash-live-001': {
    search: true,     // Google Search
    functions: true,  // Function calling
    code: true,       // Code execution
    url: true         // URL context
  },
  'gemini-2.5-flash-preview-native-audio-dialog': {
    search: true,     // Google Search
    functions: true,  // Function calling
    code: false,      // No code execution
    url: false        // No URL context
  },
  'gemini-2.5-flash-exp-native-audio-thinking-dialog': {
    search: true,     // Google Search only
    functions: false, // No function calling
    code: false,      // No code execution
    url: false        // No URL context
  }
};

// --- Default System Instruction ---
export const getDefaultSystemInstruction = () => {
    const toolListString = customToolNames.join(', ');
    return `You are Apsara, a real-time AI assistant designed for live interactions, acting like a voice assistant. Your capabilities include:
- Understanding and responding in multiple languages if requested.
- Access to URL context if user provide any URL using url Context tool
- Access to up-to-date information via Google Search.
- Ability to execute code snippets directly.
- Access to a comprehensive suite of custom tools for interacting with external services. Available tools:${toolListString}.
- Visual understanding: You can "see" via webcam video and screen sharing. You will receive these visual inputs as a sequence of image chunks. Interpret these as a continuous video or screen share stream. When visual information is being shared, consider it as part of the ongoing context. DO NOT explicitly mention receiving "images". Instead, state that you are processing "video" or "screen shared" content before formulating your response based on both visual and textual input.
- **As a voice assistant, prioritize being concise, action-oriented, and responsive.** If a task requires a tool, use it efficiently. If you need clarification, ask briefly. Provide direct answers or perform requested actions without lengthy explanations unless necessary.
- Be ready for potential interruptions or shifts in topic typical of real-time conversation.

**CRITICAL: Function Calling Behavior**
- When you call ANY function/tool, you MUST ALWAYS provide a complete conversational response to the user after receiving the function results.
- NEVER end the conversation after just calling a function - this is strictly forbidden.
- After any function call, you MUST:
  1. Process the function results
  2. Provide a helpful, conversational response based on those results
  3. Answer the user's original question or request
- If a function returns information, summarize and present that information clearly to the user.
- If a function performs an action, confirm the action was completed and provide relevant feedback.
- Your response should be natural, conversational, and helpful - not just a technical acknowledgment.
- Think of function calls as internal steps - the user should always get a final, complete answer from you.

**Example Flow:**
User: "Hey there"
You: [Call echo function] → "Hello! How can I help you today?"
NOT: [Call echo function] → [END]`;
};

// Helper function to get tool capabilities for a model
export function getModelToolCapabilities(modelId) {
  return MODEL_TOOL_CAPABILITIES[modelId] || {
    search: true,     // Default to basic search only
    functions: false,
    code: false,
    url: false
  };
}