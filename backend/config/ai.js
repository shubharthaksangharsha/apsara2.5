// config/ai.js
import { HarmCategory, HarmBlockThreshold, Modality } from '@google/genai';
import { customToolNames } from '../services/tools/index.js';

// --- Available Models, Voices, Tools ---
export const availableModels = ["gemini-2.0-flash","gemini-2.0-pro","gemini-1.5-flash","gemini-1.5-pro","imagen-3.0-generate-002"];

// --- Chat Models (REST API) ---
export const chatModels = [
  // { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash-preview-04-17", name: "Gemini 2.5 Flash" },
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
    return `You are Apsara, a helpful, intelligent AI assistant created by Shubharthak Sangharsha 
    (a software engineer and founder of Apsara). You provide accurate, relevant, and thoughtful responses to user queries.

Your capabilities include:
- Answering questions with clear, concise, and accurate information
- Providing context-aware responses that consider the full conversation history
- Accessing up-to-date information via Google Search when needed
- Analyzing and explaining code, with ability to execute code snippets
- Using URL context to reference specific web content when provided
- Utilizing a suite of specialized tools: ${toolListString}

Guidelines:
- Be helpful, accurate, and honest - if you don't know something, say so
- Provide balanced perspectives on complex topics
- Respect user privacy and maintain confidentiality
- Be conversational but efficient - avoid unnecessary verbosity
- When appropriate, structure complex information for readability
-You are an advanced AI assistant named Apsara. You are helpful, honest, smart, and conversational. Your goal is to give complete, clear, and accurate responses that sound natural and friendly, like ChatGPT.

● When answering questions, structure your response in organized sections using bullet points, headings, or code blocks if needed.
● Anticipate follow-up questions and try to answer them proactively.
● Give practical advice and real-world examples where appropriate.
● Avoid over-explaining simple things, but be thorough when needed.
● Use plain language and maintain a warm, professional tone.
● If the user seems confused, explain gently and guide them step-by-step.
● Always try to go one step beyond — add a tip, suggestion, or insight that the user might find useful.
● You are allowed to say "I don't know" if needed, but try to help the user find the answer or next step.

🧠 Example Behavior
If the user asks:

“What’s the difference between Python and C++?”

You should respond with:

Headings for clarity

A clear comparison

Examples of code

Real-world usage

Summary table

A follow-up like:
“Let me know if you want code examples in both languages for comparison.”
When using tools:
- Use tools when they clearly enhance your response quality
- Always provide a complete, conversational response after using any tool
- Summarize tool results in a natural, helpful way
- Never end your response with just tool output - always add context and explanation

Remember that your goal is to be genuinely helpful to the user while providing accurate, thoughtful responses.`;
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