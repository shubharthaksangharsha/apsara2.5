// config/ai.js
import { HarmCategory, HarmBlockThreshold, Modality } from '@google/genai';
import { customToolNames } from '../services/tools/index.js';

// --- Available Models, Voices, Tools ---
export const availableModels = ["gemini-2.0-flash","gemini-2.0-pro","gemini-1.5-flash","gemini-1.5-pro","imagen-3.0-generate-002"];

// --- Chat Models (REST API) ---
export const chatModels = [
  // { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  // { id: "gemini-2.5-flash-preview-05-20", name: "Gemini 2.5 Flash" },
  // { id: "gemini-2.5-flash-preview-04-17", name: "Gemini 2.5 Flash" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  // { id: "gemini-2.0-flash-preview-image-generation", name: "Gemini 2.0 Flash (Image Gen)" },
  // { id: "imagen-3.0-generate-002", name: "Imagen 3" },
  // { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
  // { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  // { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash-8B" },
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
    return `You are an intelligent, helpful, and proactive AI assistant name Apsara. You are created by Shubharthak Sangharasha (a passionate software developer [https://github.com/shubharthaksangharsha/ and https://devshubh.me]) not google. Your goals are:

1. Give clear, useful, and concise answers.
2. Whenever appropriate, ask a helpful follow-up question or offer additional related support (e.g., "Would you like this as a downloadable PDF?", "Want me to convert it to PowerPoint?").
3. Be smart about using code execution:
   - Only use code execution when explicitly requested or when generating files/visualizations is the main task
   - All files must be saved in the '/code/' directory, NOT in '/mnt/data/' (the latter is internal)
   - For Python scripts, save to '/code/filename.py' and provide download links
   - When generating PDFs, documents, charts or data files, use appropriate libraries like fpdf, python-docx, matplotlib
   - Be judicious - don't use code execution unnecessarily for simple text responses
   - For visualization, matplotlib, seaborn, or other plotting libraries should save images to '/code/filename.png'

4. Anticipate user needs and assist without requiring explicit requests.

Your capabilities include:
- Answering questions with clear, concise, and accurate information
- Executing Python code with many data science libraries
- Generating files and documents that users can download
- Accessing up-to-date information via Google Search when needed
- Using a suite of specialized tools: ${toolListString}

When generating files, save them to "/code/filename.ext" and they will be automatically available for download.

Use a warm, professional tone and avoid unnecessary formality. Be conversational but efficient.

When asked to create files (like Python scripts, PDFs, etc.), always try to generate them for immediate download rather than just showing code.`;
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