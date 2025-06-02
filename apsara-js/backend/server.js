// server.js
// Combined backend for Google Gemini AI (REST + WebSocket Live + Tools + File Uploads)
// Merged from app.js :contentReference[oaicite:0]{index=0}&#8203;:contentReference[oaicite:1]{index=1} and test.js :contentReference[oaicite:2]{index=2}&#8203;:contentReference[oaicite:3]{index=3}

import express from 'express';
import http from 'http';
import fs from 'fs';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import genai from '@google/genai';
import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
  FunctionCallingConfigMode,
  Modality,
  DynamicRetrievalConfigMode,
  createPartFromUri,
} from '@google/genai';
const { Blob: BlobGoogle } = genai;
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parse } from 'url';
import path from 'path';
import cors from 'cors';
import { customToolDeclarations, toolHandlers, customToolNames, getToolDeclarations } from './tools.js';
import cookieParser from 'cookie-parser';
import { 
  generateAuthUrl, 
  getTokensFromCode,
  getUserProfile, 
  verifyTokens, 
  refreshAccessToken, 
  createOAuth2Client 
} from './auth-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable not set.');
}

// Express & HTTP server setup
const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 9000;

// now you can do:
app.use(express.static(join(__dirname, 'public')));

// allow CORS from any origin (for dev) with credentials support
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if(!origin) return callback(null, true);
    
    // Allow frontend origins during development
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    if(allowedOrigins.indexOf(origin) === -1){
      return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
    }
    
    return callback(null, true);
  },
  credentials: true
}));

// Body parser (allow large base64 images)
app.use(express.json({ limit: '50mb' }));

// Cookie parser middleware for auth
app.use(cookieParser());

// Authentication state
const AUTH_COOKIE_NAME = 'apsara_auth';
const AUTH_STATE_COOKIE = 'apsara_auth_state';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false, // Set to false for local development with HTTP
  sameSite: 'lax', // Use lax to allow redirect-based cookies
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Special cookie options for the state cookie (shorter lifespan, less restrictive)
const STATE_COOKIE_OPTIONS = {
  httpOnly: true, 
  secure: false, // Must be false for local development with HTTP
  sameSite: 'lax', // More permissive for redirects
  path: '/',
  maxAge: 10 * 60 * 1000 // 10 minutes
};

// Auth middleware to extract and verify tokens
const authMiddleware = async (req, res, next) => {
  const authCookie = req.cookies[AUTH_COOKIE_NAME];
  
  if (!authCookie) {
    req.isAuthenticated = false;
    req.userTokens = null;
    req.userProfile = null;
    return next();
  }
  
  try {
    const tokens = JSON.parse(authCookie);
    
    // Check if access token is expired
    if (tokens.expiry_date && Date.now() > tokens.expiry_date) {
      // Try to refresh the token
      if (tokens.refresh_token) {
        const newTokens = await refreshAccessToken(tokens);
        res.cookie(AUTH_COOKIE_NAME, JSON.stringify(newTokens), COOKIE_OPTIONS);
        req.userTokens = newTokens;
      } else {
        req.isAuthenticated = false;
        req.userTokens = null;
        req.userProfile = null;
        return next();
      }
    } else {
      req.userTokens = tokens;
    }
    
    // Get user profile if we have valid tokens
    if (req.userTokens) {
      const isValid = await verifyTokens(req.userTokens);
      if (isValid) {
        req.isAuthenticated = true;
        try {
          req.userProfile = await getUserProfile(req.userTokens);
        } catch (err) {
          console.error('Error getting user profile:', err);
          req.userProfile = null;
        }
      } else {
        req.isAuthenticated = false;
        req.userProfile = null;
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    req.isAuthenticated = false;
    req.userTokens = null;
    req.userProfile = null;
  }
  
  next();
};

// Apply auth middleware to all requests
app.use(authMiddleware);

// Auth API Routes

// Check authentication status
app.get('/api/auth/status', (req, res) => {
  // Only log auth errors or initial auth successes, not every status check
  // console.log('Auth status check - isAuthenticated:', req.isAuthenticated);
  // console.log('Auth status check - userProfile:', req.userProfile ? 'exists' : 'null');
  // console.log('Auth cookies:', req.cookies);
  
  if (req.isAuthenticated && req.userProfile) {
    return res.json({
      isAuthenticated: true,
      profile: {
        id: req.userProfile.id,
        name: req.userProfile.name,
        email: req.userProfile.email,
        picture: req.userProfile.picture
      },
      // Also include user for backward compatibility
      user: {
        id: req.userProfile.id,
        name: req.userProfile.name,
        email: req.userProfile.email,
        picture: req.userProfile.picture
      }
    });
  }
  
  res.json({
    isAuthenticated: false,
    profile: null,
    user: null
  });
});

// Get Google OAuth URL
app.get('/api/auth/google/url', (req, res) => {
  try {
    const { authUrl, state } = generateAuthUrl();
    
    // Store state in a cookie for verification during callback
    res.cookie(AUTH_STATE_COOKIE, state, STATE_COOKIE_OPTIONS);
    
    res.json({ url: authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authentication URL' });
  }
});

// Handle Google OAuth callback (POST version for programmatic API calls)
app.post('/api/auth/google/callback', async (req, res) => {
  const { code, state } = req.body;
  const storedState = req.cookies[AUTH_STATE_COOKIE];
  
  // Verify state to prevent CSRF attacks
  if (!state || !storedState || state !== storedState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }
  
  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);
    
    // Get user profile
    const userProfile = await getUserProfile(tokens);
    
    // Store tokens in a cookie
    res.cookie(AUTH_COOKIE_NAME, JSON.stringify(tokens), COOKIE_OPTIONS);
    
    // Clear state cookie
    res.clearCookie(AUTH_STATE_COOKIE);
    
    res.json({
      success: true,
      user: userProfile
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Handle Google OAuth callback (GET version for redirect from Google)
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies[AUTH_STATE_COOKIE];
  
  // Debug logging
  console.log('Received state:', state);
  console.log('Stored state:', storedState);
  console.log('All cookies:', req.cookies);
  
  // Verify state to prevent CSRF attacks
  // In development, we'll bypass state verification to make authentication easier
  const isDevMode = process.env.NODE_ENV !== 'production' || !process.env.NODE_ENV;
  
  if (!isDevMode && (!state || !storedState || state !== storedState)) {
    return res.status(400).send('Invalid state parameter. Authentication failed. Check console logs for details.');
  } else if (isDevMode) {
    console.log('Development mode: Bypassing state verification for easier testing');
  }
  
  // Clear the state cookie regardless of validation (important for retry attempts)
  res.clearCookie(AUTH_STATE_COOKIE);
  
  try {
    console.log('Exchanging code for tokens...');
    // Exchange the authorization code for tokens
    const tokens = await getTokensFromCode(code);
    console.log('Tokens received:', tokens ? 'success' : 'failed');
    
    // Get user profile for logging purposes
    try {
      const userProfile = await getUserProfile(tokens);
      console.log('User profile fetched:', userProfile ? userProfile.email : 'No profile');
    } catch (profileError) {
      console.error('Error fetching user profile:', profileError);
      // Continue anyway - profile fetch is not critical
    }
    
    // Store tokens in an HTTP-only cookie
    console.log('Setting auth cookie...');
    res.cookie(AUTH_COOKIE_NAME, JSON.stringify(tokens), COOKIE_OPTIONS);
    
    // Set a visible cookie to confirm auth (non-httpOnly for client-side access)
    res.cookie('apsara_auth_status', 'authenticated', {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    console.log('Redirecting to frontend...');
    // Redirect to the frontend
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed. Error: ' + error.message);
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.json({ success: true });
});

// File upload
const upload = multer({ dest: 'uploads/' });
const uploadedFiles = [];

// Initialize Gemini AI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Available Models, Voices, Tools ---
const availableModels = ["gemini-2.0-flash","gemini-2.0-pro","gemini-1.5-flash","gemini-1.5-pro","imagen-3.0-generate-002"];

// --- Available Live Models ---
// Cache for models with TTL
let liveModelsCache = {
  models: null,
  timestamp: 0,
  ttl: 10 * 60 * 1000 // 10 minutes cache TTL
};

// Define model-specific tool capabilities
const MODEL_TOOL_CAPABILITIES = {
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

// Helper function to get tool capabilities for a model
function getModelToolCapabilities(modelId) {
  return MODEL_TOOL_CAPABILITIES[modelId] || {
    search: true,     // Default to basic search only
    functions: false,
    code: false,
    url: false
  };
}

// Default models as fallback
const DEFAULT_LIVE_MODELS = [
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

// Function to fetch models from Google Gemini API
async function fetchLiveModels() {
  try {
    // Check if we have a valid cache
    const now = Date.now();
    if (liveModelsCache.models && (now - liveModelsCache.timestamp < liveModelsCache.ttl)) {
      console.log('[Models] Returning cached live models');
      return liveModelsCache.models;
    }
    
    console.log('[Models] Fetching live models from Gemini API');
    
    // Simplified implementation for stability
    // TODO: Replace with actual API call when endpoint is available
    // Would be something like:
    // const response = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + process.env.GEMINI_API_KEY);
    // const data = await response.json();
    // const liveModels = data.models.filter(model => model.name.includes('live'));
    
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Cache the models
    liveModelsCache.models = DEFAULT_LIVE_MODELS;
    liveModelsCache.timestamp = now;
    
    console.log('[Models] Fetched and cached live models');
    return DEFAULT_LIVE_MODELS;
  } catch (error) {
    console.error('[Models] Error fetching live models:', error);
    // Always return fallback models on error
    return DEFAULT_LIVE_MODELS;
  }
}

// --- Chat Models (REST API) ---
const chatModels = [
  { id: "gemini-2.5-flash-preview-04-17", name: "Gemini 2.5 Flash Preview" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  { id: "gemini-2.0-flash-preview-image-generation", name: "Gemini 2.0 Flash (Image Gen)" },
  { id: "imagen-3.0-generate-002", name: "Imagen 3" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash-8B" },
];
const availableVoices = ['Puck','Charon','Kore','Fenrir','Aoede','Leda','Orus','Zephyr'];

// --- Default System Instruction ---
const getDefaultSystemInstruction = () => {
    const toolListString = customToolNames.join(', ');
    return `You are Apsara, a real-time AI assistant designed for live interactions, acting like a voice assistant. Your capabilities include:
- Understanding and responding in multiple languages if requested.
- Access to up-to-date information via Google Search.
- Ability to execute code snippets directly.
- Access to a comprehensive suite of custom tools for interacting with external services. Available tools:${toolListString}.
- Visual understanding: You can "see" via webcam video and screen sharing. You will receive these visual inputs as a sequence of image chunks. Interpret these as a continuous video or screen share stream. When visual information is being shared, consider it as part of the ongoing context. DO NOT explicitly mention receiving "images". Instead, state that you are processing "video" or "screen shared" content before formulating your response based on both visual and textual input.
- **As a voice assistant, prioritize being concise, action-oriented, and responsive.** If a task requires a tool, use it efficiently. If you need clarification, ask briefly. Provide direct answers or perform requested actions without lengthy explanations unless necessary.
- Be ready for potential interruptions or shifts in topic typical of real-time conversation.`;
};
let currentSystemInstruction = getDefaultSystemInstruction();
// -----------------------------------

let currentVoice = availableVoices[0];

// In‐memory WebSocket sessions
const sessions = new Map();

// Helper: build API request for /chat and /chat/stream
function buildApiRequest(body) {
  const { modelId, contents, config } = body;
  if (!contents || !Array.isArray(contents) || !contents.length) {
    throw new Error('Missing or invalid "contents" array in request body.');
  }
  const selectedModelId = modelId || 'gemini-2.0-flash'; // Default model if not provided

  // Process contents to include inline image data if fileData is present
  const processedContents = contents.map(contentPart => {
    if (contentPart.role === 'user' && contentPart.parts) {
      const newParts = [];
      let fileDataArray = null;

      contentPart.parts.forEach(part => {
        if (part.fileData && Array.isArray(part.fileData)) {
          fileDataArray = part.fileData; // Store fileData to be processed
        } else {
          newParts.push(part); // Keep non-fileData parts
        }
      });

      if (fileDataArray) {
        fileDataArray.forEach(file => {
          if (file.id && file.type && file.type.startsWith('image/')) {
            try {
              const filePath = path.join(__dirname, 'uploads', file.id);
              if (fs.existsSync(filePath)) {
                const imageBuffer = fs.readFileSync(filePath);
                const base64ImageData = imageBuffer.toString('base64');
                newParts.push({
                  inlineData: {
                    mimeType: file.type,
                    data: base64ImageData
                  }
                });
              } else {
                console.warn(`[buildApiRequest] Image file not found: ${filePath} for file ID: ${file.id}`);
                // Optionally, add a text part indicating the image was not found
                // newParts.push({ text: `[Image ${file.name || file.id} not found]` });
              }
            } catch (e) {
              console.error(`[buildApiRequest] Error processing image file ${file.id}:`, e);
              // Optionally, add a text part indicating an error
              // newParts.push({ text: `[Error processing image ${file.name || file.id}]` });
            }
          }
        });
        return { ...contentPart, parts: newParts };
      }
    }
    return contentPart;
  });

  const apiRequest = { model: selectedModelId, contents: processedContents, config: {} };

  // Define models that DO support thinking configuration
  const modelsWithThinkingConfigSupport = {
    "gemini-2.5-pro-exp-03-25": { supportsBudget: false },
    "gemini-2.5-flash-preview-04-17": { supportsBudget: true },
    // Add other model IDs here if they support thinking_config
  };

  // Image‐gen modalities
  if (selectedModelId === 'gemini-2.0-flash-preview-image-generation') {
    apiRequest.config.responseModalities = [Modality.TEXT, Modality.IMAGE];
  }

  if (config) {
    // System instruction
    if (config.systemInstruction) apiRequest.config.systemInstruction = config.systemInstruction;
    // Safety
    if (config.safetySettings) {
      apiRequest.config.safetySettings = config.safetySettings.map(s => ({
        category: HarmCategory[s.category]||s.category,
        threshold: HarmBlockThreshold[s.threshold]||s.threshold
      }));
    }

    // Thinking config - only add if model supports it and client sends it
    if (modelsWithThinkingConfigSupport[selectedModelId] && config.thinkingConfig) {
      apiRequest.config.thinkingConfig = {}; // Initialize

      // Explicitly set includeThoughts based on the client's request
      if (typeof config.thinkingConfig.includeThoughts === 'boolean') {
        apiRequest.config.thinkingConfig.includeThoughts = config.thinkingConfig.includeThoughts;
      }

      // Apply thinkingBudget if model supports it, budget is provided, and includeThoughts is not explicitly false
      if (modelsWithThinkingConfigSupport[selectedModelId].supportsBudget && 
          config.thinkingConfig.thinkingBudget != null && 
          apiRequest.config.thinkingConfig.includeThoughts !== false) { 
        const b = parseInt(config.thinkingConfig.thinkingBudget, 10);
        if (!isNaN(b)) {
          apiRequest.config.thinkingConfig.thinkingBudget = b;
        }
      }

      // If includeThoughts is explicitly false, ensure only that is sent for thinkingConfig
      if (apiRequest.config.thinkingConfig.includeThoughts === false) {
        apiRequest.config.thinkingConfig = { includeThoughts: false };
      } else if (Object.keys(apiRequest.config.thinkingConfig).length === 0 || 
                 (Object.keys(apiRequest.config.thinkingConfig).length === 1 && 
                  apiRequest.config.thinkingConfig.hasOwnProperty('includeThoughts') && 
                  apiRequest.config.thinkingConfig.includeThoughts === true && 
                  !apiRequest.config.thinkingConfig.hasOwnProperty('thinkingBudget'))) {
         // If it's empty after processing, or only contains includeThoughts:true (default state without budget/explicit false)
         // and the original request from client didn't have thinkingConfig.includeThoughts: false
        if (!(config.thinkingConfig && typeof config.thinkingConfig.includeThoughts === 'boolean' && config.thinkingConfig.includeThoughts === false)){
            delete apiRequest.config.thinkingConfig; // Delete if effectively no thinking config is needed
        }
      }
      // Final check: if thinkingConfig is an empty object, remove it, unless it was explicitly {includeThoughts: false}
      if (apiRequest.config.thinkingConfig && Object.keys(apiRequest.config.thinkingConfig).length === 0) {
        delete apiRequest.config.thinkingConfig;
      }
    } else if (config.thinkingConfig && config.thinkingConfig.includeThoughts === false) {
      // If model doesn't support thinking BUT client explicitly sends includeThoughts: false,
      // we should still send this to the API, as it might be a general parameter.
      // However, given the errors, it's safer to only send thinkingConfig for supported models.
      // For now, we will NOT add thinkingConfig if model is not in modelsWithThinkingConfigSupport.
      // If API behavior changes, this else-if could be: apiRequest.config.thinkingConfig = { includeThoughts: false };
    }

    // GenerationConfig & JSON schema
    if (config.generationConfig) {
      const gc = config.generationConfig;
      if (gc.responseMimeType) apiRequest.config.responseMimeType = gc.responseMimeType;
      if (gc.responseSchema) apiRequest.config.responseSchema = gc.responseSchema;
      const { responseMimeType,responseSchema,numberOfImages,aspectRatio,personGeneration,...std } = gc;
      if (Object.keys(std).length) apiRequest.config.generationConfig = std;
    }
    // Clear existing tools configuration
    delete apiRequest.config.tools;
    
    // Only set tools configuration if we have tools or explicit tool preferences
    if (config.tools && Array.isArray(config.tools)) {
      // 1. If client explicitly sent tools array, use it exactly as is
      if (config.tools.length > 0) {
        console.log('[buildApiRequest] Using explicitly provided tools:', JSON.stringify(config.tools));
        apiRequest.config.tools = [...config.tools];
      } 
      // 2. Empty tools array means client wants no tools
      else {
        console.log('[buildApiRequest] Client sent empty tools array - no tools will be used');
        // No tools needed, leave apiRequest.config.tools unset
      }
    }
    // If we don't have a tools array but have Google Search flag, add it
    else if (config.enableGoogleSearch === true) {
      console.log('[buildApiRequest] Adding Google Search based on flag');
      apiRequest.config.tools = [{ googleSearch:{} }];
    }
    // If we don't have a tools array but have Google Search Retrieval flag, add it
    else if (config.enableGoogleSearchRetrieval === true) {
      const t = { googleSearchRetrieval:{} };
      if (config.dynamicRetrievalThreshold != null) {
        const thr = parseFloat(config.dynamicRetrievalThreshold);
        if (!isNaN(thr)) t.googleSearchRetrieval.dynamicRetrievalConfig = {
          dynamicThreshold:thr, mode:DynamicRetrievalConfigMode.MODE_DYNAMIC
        };
      }
      apiRequest.config.tools = [t];
      console.log('[buildApiRequest] Adding Google Search Retrieval based on flag');
    }
    
    // Log the final tools configuration for debugging
    console.log('[buildApiRequest] Final tools config:', apiRequest.config.tools ? JSON.stringify(apiRequest.config.tools) : 'No tools');
    
    // Don't send empty tools array to the API
    if (apiRequest.config.tools && apiRequest.config.tools.length === 0) {
      delete apiRequest.config.tools;
    }
    // Tool‐calling config
    if (config.toolConfig) {
      const m = config.toolConfig.functionCallingConfig?.mode;
      apiRequest.config.toolConfig = m ? {
        functionCallingConfig:{
          mode:FunctionCallingConfigMode[m]||m,
          allowedFunctionNames:config.toolConfig.functionCallingConfig.allowedFunctionNames
        }
      } : config.toolConfig;
    }
  }
  return apiRequest;
}

// --- REST: Health, Models, Voices, System, Tools, Files ---
app.get('/health', (req,res)=>res.json({status:'ok'}));

// Models endpoints
// Model endpoints - support both /api prefixed and legacy routes for compatibility
// Chat models endpoint
app.get('/api/models', (req, res) => {
  try {
    console.log('[GET /api/models] Serving chat models');
    res.json(chatModels);
  } catch (error) {
    console.error('[GET /api/models] Error:', error);
    res.status(500).json({ error: 'Failed to fetch chat models' });
  }
});

// Live models endpoint with /api prefix
app.get('/api/models/live', async (req, res) => {
  try {
    console.log('[GET /api/models/live] Fetching live models');
    const models = await fetchLiveModels();
    console.log('[GET /api/models/live] Success, sending', models.length, 'models');
    res.json(models);
  } catch (error) {
    console.error('[GET /api/models/live] Error:', error);
    res.status(500).json({ error: 'Failed to fetch live models' });
  }
});

// Legacy endpoints (without /api prefix)
app.get('/models', (req, res) => {
  try {
    console.log('[GET /models] Serving chat models (legacy endpoint)');
    res.json(chatModels);
  } catch (error) {
    console.error('[GET /models] Error:', error);
    res.status(500).json({ error: 'Failed to fetch chat models' });
  }
});

app.get('/models/live', async (req, res) => {
  try {
    console.log('[GET /models/live] Fetching live models (legacy endpoint)');
    const models = await fetchLiveModels();
    console.log('[GET /models/live] Success, sending', models.length, 'models');
    res.json(models);
  } catch (error) {
    console.error('[GET /models/live] Error:', error);
    res.status(500).json({ error: 'Failed to fetch live models' });
  }
});

app.get('/voices',(req,res)=>res.json({voices:availableVoices}));
app.post('/voices/select',(req,res)=>{
  const { voiceName }=req.body;
  if (!availableVoices.includes(voiceName)) return res.status(400).json({ error:'Invalid voice name.' });
  currentVoice=voiceName;
  res.json({ selectedVoice:currentVoice });
});

app.get('/system',(req,res)=>res.json({ systemInstruction:currentSystemInstruction }));
app.post('/system',(req,res)=>{
  const { instruction } = req.body;
  if (!instruction) return res.status(400).json({ error:'Instruction required.' });
  currentSystemInstruction=instruction;
  res.json({ updatedInstruction:currentSystemInstruction });
});

app.get('/tools', (req, res) => {
  // Get authentication-aware tool declarations
  const toolsToUse = getToolDeclarations(!!req.userTokens);
  res.json({ 
    tools: toolsToUse,
    isAuthenticated: req.isAuthenticated || false
  });
});

app.post('/tools/invoke',(req,res)=>{
  const { toolName, args } = req.body;
  if (!toolHandlers[toolName]) return res.status(400).json({ error:'Unknown tool.' });
  try { 
    console.log(`[Tool Invoke] Executing tool: ${toolName}`);
    const isGoogleTool = [
      'sendGmail', 'draftGmail', 'listGmailMessages', 'getGmailMessage',
      'listCalendarEvents', 'createCalendarEvent', 'getCalendarEvent'
    ].includes(toolName);
    
    let result;
    if (isGoogleTool) {
      if (!req.isAuthenticated || !req.userTokens) {
        return res.status(401).json({ 
          error: 'Authentication required for this tool.', 
          toolName 
        });
      }
      // Make sure args is defined and is an object
      const safeArgs = args && typeof args === 'object' ? args : {};
      console.log(`[Tool Invoke] Invoking Google tool ${toolName} with args:`, safeArgs);
      result = toolHandlers[toolName](req, safeArgs);
    } else {
      // For other tools, just pass the args
      result = toolHandlers[toolName](args||{});
    }
    
    res.json({ toolName, result });
  } catch(e){ 
    console.error(`[Tool Invoke] Error executing ${toolName}:`, e);
    res.status(500).json({ error:e.message }); 
  }
});

app.post('/files',upload.single('file'), async (req,res)=>{
  if (!req.file) return res.status(400).json({ error:'File required.' });
  
  console.log(`[POST /files] Received file: ${req.file.originalname}, size: ${req.file.size}, path: ${req.file.path}`);

  try {
    // Step 1: Upload to Google File API
    console.log(`[POST /files] Uploading "${req.file.originalname}" to Google File API...`);
    const googleFileResource = await ai.files.upload({
      file: req.file.path, // multer saves it to a temp path
      config: {
        displayName: req.file.originalname,
        mimeType: req.file.mimetype,
      },
    });

    console.log(`[POST /files] Google File API upload initiated. File Name: ${googleFileResource.name}, State: ${googleFileResource.state}`);

    // Step 2: Wait for the file to be processed
    let getFile = googleFileResource;
    let retries = 0;
    const maxRetries = 12; // Poll for up to 60 seconds (12 * 5s)
    
    while (getFile.state === 'PROCESSING' && retries < maxRetries) {
      console.log(`[POST /files] File "${getFile.name}" is still PROCESSING. Retrying in 5 seconds... (Attempt ${retries + 1})`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      getFile = await ai.files.get({ name: getFile.name });
      retries++;
    }

    if (getFile.state === 'FAILED') {
      console.error(`[POST /files] Google File API processing FAILED for "${getFile.name}". Reason: ${getFile.error?.message || 'Unknown error'}`);
      // Optionally, try to delete the failed file from Google if possible, though not critical
      // await ai.files.delete({name: getFile.name });
      return res.status(500).json({ error: `File processing failed on Google's side: ${getFile.error?.message || 'Unknown error'}` });
    }

    if (getFile.state !== 'ACTIVE') {
      console.error(`[POST /files] File "${getFile.name}" did not become ACTIVE after ${retries} retries. Final state: ${getFile.state}`);
      return res.status(500).json({ error: `File processing timed out or ended in an unexpected state: ${getFile.state}` });
    }

    console.log(`[POST /files] File "${getFile.name}" is ACTIVE. URI: ${getFile.uri}`);

    const fileMetadata = {
      id: getFile.name, // Google's file name is the unique ID (e.g., "files/...")
      originalname: req.file.originalname,
      mimetype: getFile.mimeType, // Use mimeType from Google's response
      size: req.file.size, // Original size from multer
      uri: getFile.uri, // Crucial for creating fileData parts
      googleFileName: getFile.name, // Store the full Google file name
      state: getFile.state,
      uploadTimestamp: Date.now()
    };
    
    uploadedFiles.push(fileMetadata);
    
    // Clean up the temporary file saved by multer
    // import fs from 'fs/promises'; // Make sure to import fs/promises at the top
    // try {
    //   await fs.unlink(req.file.path);
    //   console.log(`[POST /files] Deleted temporary file: ${req.file.path}`);
    // } catch (unlinkError) {
    //   console.error(`[POST /files] Error deleting temporary file ${req.file.path}:`, unlinkError);
    // }

    res.json({ file: fileMetadata });

  } catch (error) {
    console.error('[POST /files] Error during file upload to Google or processing:', error);
    // Clean up temp file on error too
    // if (req.file && req.file.path) {
    //   try { await fs.unlink(req.file.path); } catch (e) { console.error("Error cleaning up temp file on failure:", e); }
    // }
    res.status(500).json({ error: error.message || 'Internal server error during file upload processing.' });
  }
});
app.get('/files',(req,res)=>res.json({ files:uploadedFiles }));

// Add endpoint to fetch file content from Google File API
app.get('/files/content', async (req, res) => {
  try {
    // Extract file ID from query parameters
    const { fileId, uri } = req.query;
    
    if (!fileId && !uri) {
      return res.status(400).json({ error: 'Either fileId or uri parameter is required' });
    }
    
    let googleFileApiName;
    
    if (fileId) {
      // If direct fileId is provided
      googleFileApiName = fileId.startsWith('files/') ? fileId : `files/${fileId}`;
      console.log(`[GET /files/content] Fetching content for file: ${googleFileApiName}`);
    } else if (uri) {
      // If full URI is provided, extract the fileId from the end
      const uriParts = uri.split('/');
      const extractedId = uriParts[uriParts.length - 1];
      googleFileApiName = `files/${extractedId}`;
      console.log(`[GET /files/content] Extracted ID from URI: ${extractedId}`);
    }
    
    // Get file content from Google File API
    const fileContent = await ai.files.getContent({ name: googleFileApiName });
    
    if (!fileContent || !fileContent.data) {
      return res.status(404).json({ error: 'File content not found' });
    }
    
    // Get file metadata to determine content type
    const fileMetadata = await ai.files.get({ name: googleFileApiName });
    
    // Set appropriate content type
    res.set('Content-Type', fileMetadata.mimeType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${fileMetadata.displayName || 'file'}"`); 
    
    // Send binary data directly
    res.send(Buffer.from(fileContent.data));
  } catch (error) {
    console.error('[GET /files/content] Error fetching file content:', error);
    res.status(500).json({ 
      error: 'Error fetching file content',
      details: error.message,
      code: error.code
    });
  }
});

app.delete('/files/:fileId', async (req, res) => {
  const fileId = req.params.fileId; // This will be the Google File API name, e.g., "files/xxxxxxxx"
  console.log(`[DELETE /files] Request to delete file with Google Name: ${fileId}`);

  if (!fileId) {
    return res.status(400).json({ error: 'File ID (Google File Name) is required.' });
  }

  try {
    // Attempt to delete from Google File API
    // The name needs to be in the format "files/FILE_ID_PART"
    const googleFileApiName = fileId.startsWith('files/') ? fileId : `files/${fileId}`;
    
    console.log(`[DELETE /files] Attempting to delete from Google File API: ${googleFileApiName}`);
    await ai.files.delete({ name: googleFileApiName });
    console.log(`[DELETE /files] Successfully deleted file ${googleFileApiName} from Google File API.`);

    // Remove from our in-memory list
    const initialLength = uploadedFiles.length;
    // We stored googleFileName as the unique ID from Google.
    const fileIndex = uploadedFiles.findIndex(f => f.googleFileName === googleFileApiName || f.id === googleFileApiName); 
    
    if (fileIndex > -1) {
      uploadedFiles.splice(fileIndex, 1);
      console.log(`[DELETE /files] Removed file ${googleFileApiName} from server's in-memory list. New count: ${uploadedFiles.length}`);
    } else {
      console.warn(`[DELETE /files] File ${googleFileApiName} was deleted from Google, but not found in server's in-memory list.`);
    }

    res.status(200).json({ message: `File ${googleFileApiName} deleted successfully.` });

  } catch (error) {
    console.error(`[DELETE /files] Error deleting file ${fileId}:`, error);
    // Google API might throw an error if the file doesn't exist, which is fine.
    // Consider the error structure from Google API for more specific handling.
    if (error.message && error.message.includes('not found')) {
        // If Google says not found, but we might still have it in our list, try removing from list.
        const fileIndex = uploadedFiles.findIndex(f => f.googleFileName === fileId || f.id === fileId);
        if (fileIndex > -1) {
            uploadedFiles.splice(fileIndex, 1);
            console.log(`[DELETE /files] File ${fileId} not found on Google (perhaps already deleted), removed from server list.`);
            return res.status(200).json({ message: `File ${fileId} was already deleted from Google or not found, removed from local list.` });
        }
        return res.status(404).json({ error: `File ${fileId} not found on Google File API.` });
    }
    res.status(500).json({ error: error.message || 'Internal server error during file deletion.' });
  }
});

// --- REST: /chat, /chat/stream, /chat/function-result ---
app.post('/chat', async (req,res)=>{
  const modelId=req.body.modelId||'gemini-2.0-flash';
  try {
    // Imagen 3
    if (modelId==='imagen-3.0-generate-002') {
      const prompt=req.body.contents.find(c=>c.role==='user').parts.find(p=>p.text).text;
      const cfg={}, gc=req.body.config?.generationConfig;
      if (gc?.numberOfImages) cfg.numberOfImages=gc.numberOfImages;
      if (gc?.aspectRatio) cfg.aspectRatio=gc.aspectRatio;
      if (gc?.personGeneration) cfg.personGeneration=gc.personGeneration;
      const result=await ai.models.generateImages({ model:modelId,prompt,config:cfg });
      const parts=result.generatedImages.map(img=>({ inlineData:{ mimeType:'image/png', data:img.image.imageBytes }}));
      return res.json({ response:parts });
    }
    // Gemini image‐gen
    if (modelId==='gemini-2.0-flash-preview-image-generation') {
      const reqA=buildApiRequest(req.body);
      const result=await ai.models.generateContent(reqA);
      const c=result.candidates[0];
      if (['SAFETY','RECITATION'].includes(c.finishReason)) return res.status(400).json({});
      return res.json({
        response:c.content.parts,
        usageMetadata:result.usageMetadata,
        finishReason:c.finishReason,
        safetyRatings:c.safetyRatings,
        groundingMetadata:c.groundingMetadata
      });
    }
    // Default Gemini
    const apiRequest=buildApiRequest(req.body);
    console.log(`[POST /chat] Request to Google API (Model: ${modelId}):`, JSON.stringify(apiRequest, null, 2));
    const result=await ai.models.generateContent(apiRequest);
    console.log(`[POST /chat] Response from Google API:`, JSON.stringify(result, null, 2));
    const c=result.candidates[0];
    if (['SAFETY','RECITATION'].includes(c.finishReason)) return res.status(400).json({});
    // --- MODIFIED RESPONSE PROCESSING ---
    // Check if the primary response is within parts (most common case)
    let finalResponseParts = [];
    if (c.content?.parts && Array.isArray(c.content.parts)) {
        finalResponseParts = c.content.parts;
    } else if (result.text) { // Fallback for simple text responses
        finalResponseParts.push({ text: result.text });
    }

    // Return the full parts array structure
    return res.json({
      response: finalResponseParts, // Send the array of parts
      usageMetadata:result.usageMetadata,
      finishReason:c.finishReason,
      safetyRatings:c.safetyRatings,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error:e.message });
  }
});

app.post('/chat/stream', async (req, res) => {
    const modelId = req.body.modelId || 'gemini-2.0-flash';
  try {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });

        const apiRequest = buildApiRequest(req.body);
        console.log(`[POST /chat/stream] Request to Google API (Model: ${modelId}):`, JSON.stringify(apiRequest, null, 2)); // Original console.log
        const stream = await ai.models.generateContentStream(apiRequest);

    for await (const chunk of stream) {
            const candidate = chunk.candidates?.[0];
            if (!candidate) continue; 

            if (candidate.content?.parts) {
                for (const part of candidate.content.parts) {
                    let eventData = {};
                    if (part.text) {
                        eventData.text = part.text;
                    }
                    // Explicitly check for the thought property from Gemini API response
                    if (part.thought) { 
                        eventData.thought = true;
                    }
                    if (part.inlineData) {
                        eventData.inlineData = part.inlineData;
                    }
                    if (part.executableCode) {
                        eventData.executableCode = part.executableCode;
                    }
                    if (part.codeExecutionResult) {
                        eventData.codeExecutionResult = part.codeExecutionResult;
                    }

                    if (Object.keys(eventData).length > 0) {
                         const dataString = `data: ${JSON.stringify(eventData)}\n\n`;
                         console.log('[STREAMING TO CLIENT]', dataString); // Added console.log as requested
                         res.write(dataString);
                    }
                }
            }

            if (chunk.functionCalls) {
                const fcDataString = `event: function_call\ndata: ${JSON.stringify({ functionCalls: chunk.functionCalls })}\n\n`;
                console.log('[STREAMING FUNCTION CALL TO CLIENT]', fcDataString); // Optional: log function calls too
                res.write(fcDataString);
            }

            if (candidate.groundingMetadata) {
                const gmDataString = `event: grounding\ndata: ${JSON.stringify(candidate.groundingMetadata)}\n\n`;
                console.log('[STREAMING GROUNDING METADATA TO CLIENT]', gmDataString); // Optional: log grounding too
                res.write(gmDataString);
            }

            if (candidate.finishReason && candidate.finishReason !== 'FINISH_REASON_UNSPECIFIED') {
                 const finalData = {
                    finishReason: candidate.finishReason,
                    usageMetadata: chunk.usageMetadata, // Usually comes with the final chunk
                    safetyRatings: candidate.safetyRatings
                 };
                 const finalDataString = `event: done\ndata: ${JSON.stringify(finalData)}\n\n`;
                 console.log('[STREAMING DONE TO CLIENT]', finalDataString);
                 res.write(finalDataString);
            }
        }
    } catch (e) {
        console.error('[STREAM ERROR]',e);
        // Ensure the error message is properly formatted for JSON
        const errorMessage = (e instanceof Error) ? e.message : 'Stream error occurred.';
        // Attempt to get more details from the error if they exist (e.g., from API errors)
        const errorCode = e.code || (e.details && e.details.code) || (e.error && e.error.code);
        const errorStatus = e.status || (e.details && e.details.status) || (e.error && e.error.status);
        const errorDetails = (e.details && typeof e.details === 'object') ? e.details : (e.error && typeof e.error === 'object' ? e.error : { message: errorMessage });

        const errorPayload = { 
            error: {
                 message: errorMessage, 
                 ...(errorCode && { code: errorCode }),
                 ...(errorStatus && { status: errorStatus }),
                 details: errorDetails
            }
        };
        const errorDataString = `event: error\ndata: ${JSON.stringify(errorPayload)}\n\n`;
        console.log('[STREAMING ERROR TO CLIENT]', errorDataString);
        if (!res.headersSent) {
             res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
        }
        res.write(errorDataString);
    } finally {
        console.log('[STREAM ENDED]');
        res.end();
    }
});

app.post('/chat/function-result', async (req,res)=>{
  try {
    const { modelId, originalContents, functionResponse, config }=req.body;
    if (!originalContents||!functionResponse) return res.status(400).json({ error:'Invalid input.' });
    const newContents=[...originalContents,{ role:'function', parts:[{ functionResponse:{ name:functionResponse.name, response:functionResponse.response }}]}];
    const apiRequest={ model:modelId||'gemini-2.0-flash', contents:newContents, config:{} };
    if (config) apiRequest.config=config;
    const result=await ai.models.generateContent(apiRequest);
    const c=result.candidates[0];
    let resp=c.text;
    if (apiRequest.config.responseMimeType==='application/json') {
      try { resp=JSON.parse(c.text); } catch{}
    }
    res.json({ response:resp, usageMetadata:result.usageMetadata, finishReason:c.finishReason });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error:e.message });
  }
});

// --- WebSocket "live" bridging ---
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  let pathname;
  try {
    // Extract pathname safely
    pathname = req.url ? parse(req.url).pathname : undefined;
    console.log(`[HTTP Upgrade] Received upgrade request for path: ${pathname}`);

    if (pathname === '/live') {
      console.log(`[HTTP Upgrade] Path matches /live. Attempting upgrade...`);
      wss.handleUpgrade(req, socket, head, (wsClient) => {
        // wsClient is the connection to the *browser*
        console.log('[HTTP Upgrade] WebSocket upgrade successful. Passing to handleLiveConnection.');

        // Add immediate confirmation to client that backend received connection
        try {
            if (wsClient.readyState === WebSocket.OPEN) {
               wsClient.send(JSON.stringify({ event: 'backend_connected' })); // Send immediate ack
            }
        } catch(e){ console.error("[HTTP Upgrade] Error sending backend_connected ack:", e); }


        // Wrap handleLiveConnection in a promise chain to catch errors
        Promise.resolve() // Start promise chain
          .then(() => handleLiveConnection(wsClient, req)) // Execute async handler
          .catch(err => { // Catch any error from handleLiveConnection
            console.error('[HTTP Upgrade] CRITICAL ERROR during handleLiveConnection execution:', err);
            try {
              if (wsClient.readyState === WebSocket.OPEN || wsClient.readyState === WebSocket.CONNECTING) {
                wsClient.send(JSON.stringify({ event: 'error', message: `Backend error during connection setup: ${err.message || 'Unknown error'}` }));
                wsClient.close(1011, "Backend internal error");
              }
            } catch (e) {
              console.error("[HTTP Upgrade] Error sending critical error back to client:", e);
            }
          });
      });
    } else {
      console.log(`[HTTP Upgrade] Path ${pathname} does not match /live. Destroying socket.`);
      socket.destroy();
    }
  } catch (upgradeError) {
    console.error(`[HTTP Upgrade] Error during upgrade check for path ${pathname}:`, upgradeError);
    try {
      socket.destroy(); // Ensure socket is destroyed on error
    } catch (e) {}
  }
});

async function handleLiveConnection(ws, req) {
   console.log("[Live Backend] handleLiveConnection started.");
   
   // Process auth cookies for WebSocket connection
   // The WebSocket request doesn't automatically process cookies through middleware
   let isAuthenticated = false;
   let userTokens = null;
   
   // Initialize variables for live session configuration
   let requestedModality = 'AUDIO';
   let requestedVoice = null;
   let requestedSystemInstruction = null;
   let transcriptionEnabled = true;
   let slidingWindowEnabled = true;
   let slidingWindowTokens = 4000;
   let requestedModel = 'gemini-2.0-flash-live-001'; // Default model
   let requestedResumeHandle = null;
   let mediaResolution = "MEDIA_RESOLUTION_MEDIUM"; // Default media resolution
   let requestedRealtimeConfig = {}; // Initialize empty realtime config
   
   try {
       const cookies = req.headers.cookie;
       if (cookies) {
           console.log(`[Live Backend] Processing cookies from WebSocket request...`);
           const cookiePairs = cookies.split(';');
           const cookieMap = {};
           
           cookiePairs.forEach(pair => {
               const [key, value] = pair.trim().split('=');
               cookieMap[key] = decodeURIComponent(value);
           });
           
           console.log(`[Live Backend] Found cookies: ${Object.keys(cookieMap).join(', ')}`);
           
           // Check for auth cookie and extract tokens
           if (cookieMap[AUTH_COOKIE_NAME]) {
               try {
                   userTokens = JSON.parse(cookieMap[AUTH_COOKIE_NAME]);
                   isAuthenticated = true;
                   console.log(`[Live Backend] Successfully extracted auth tokens from cookie for WebSocket connection`);
                   
                   // Attach tokens to the request object so they can be used by tool declaration functions
                   req.userTokens = userTokens;
                   req.isAuthenticated = true;
               } catch (e) {
                   console.error(`[Live Backend] Error parsing auth cookie: ${e.message}`);
               }
           }
       }

    try {
        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
        console.log(`[Live Backend] Handling connection for URL: ${req.url}`);

        // --- Modality Parsing ---
        const modalityParam = parsedUrl.searchParams.get('modalities')?.trim().toUpperCase();
        if (modalityParam === 'AUDIO') {
            requestedModality = Modality.AUDIO;
            console.log("[Live Backend] Requested Modality: AUDIO");
        } else if (modalityParam === 'VIDEO') {
            requestedModality = Modality.VIDEO;
            console.log("[Live Backend] Requested Modality: VIDEO");
        } else { // Default to TEXT if not AUDIO/VIDEO or missing
            requestedModality = Modality.TEXT;
            console.log("[Live Backend] Requested Modality: TEXT");
        }
       // --------------------------

       // --- Voice Parsing ---
       if (requestedModality === Modality.AUDIO && parsedUrl.searchParams.get('voice')) {
           const voiceParam = parsedUrl.searchParams.get('voice');
           if (availableVoices.includes(voiceParam)) {
               requestedVoice = voiceParam;
               console.log(`[Live Backend] Using requested voice: ${requestedVoice}`);
           } else {
               console.warn(`[Live Backend] Requested voice '${voiceParam}' not available, using default '${requestedVoice}'`);
           }
       } else {
           console.log("[Live Backend] Text modality selected or voice param missing, voice parameter ignored.");
            requestedVoice = null;
       }

       // --- System Instruction Parsing ---
       if (parsedUrl.searchParams.get('system')) {
           // Decode URI component in case it's encoded
           try {
               requestedSystemInstruction = decodeURIComponent(parsedUrl.searchParams.get('system').toString());
               console.log(`[Live Backend] Using requested system instruction: "${requestedSystemInstruction.substring(0, 50)}..."`);
           } catch (e) {
                console.error('[Live Backend] Error decoding system instruction parameter:', e);
                // Decide how to handle error - ignore or reject connection? Let's ignore for now.
           }
       } else {
           console.log("[Live Backend] No system instruction provided.");
       }
       // ---------------------------------

        // VAD Config (Example)
        if (parsedUrl.searchParams.get('disablevad') === 'true' && requestedModality === Modality.AUDIO) {
             requestedRealtimeConfig.disableAutomaticActivityDetection = true;
             console.log("[Live Backend] Automatic activity detection (VAD) DISABLED via query param.");
        }
        
        // --- Native Audio Features Detection ---
        console.log(`[Live Backend] URL query params: ${req.url}`);
        
        // Extract all query parameters for debugging
        const allParams = {};
        for (const [key, value] of parsedUrl.searchParams.entries()) {
            allParams[key] = value;
        }
        console.log('[Live Backend] All query parameters:', JSON.stringify(allParams));
        
        // IMPROVED: Enhanced native audio feature detection with better logging
        // Explicitly check for the presence of each specific feature parameter
        const hasAffectiveDialog = parsedUrl.searchParams.has('enableAffectiveDialog') && 
                                  parsedUrl.searchParams.get('enableAffectiveDialog') === 'true';
        const hasProactiveAudio = parsedUrl.searchParams.has('proactiveAudio') && 
                                parsedUrl.searchParams.get('proactiveAudio') === 'true';
        const hasGenericNativeAudio = parsedUrl.searchParams.has('nativeAudio') &&
                                    parsedUrl.searchParams.get('nativeAudio') === 'true';
        
        // Print detailed parameter analysis
        console.log('💾 [Live Backend] Native Audio Feature Parameters:');
        console.log('  * enableAffectiveDialog =', parsedUrl.searchParams.get('enableAffectiveDialog'));
        console.log('  * proactiveAudio =', parsedUrl.searchParams.get('proactiveAudio'));
        console.log('  * nativeAudio =', parsedUrl.searchParams.get('nativeAudio'));
        
        // Check for media resolution parameter
        mediaResolution = parsedUrl.searchParams.get('mediaResolution') || "MEDIA_RESOLUTION_MEDIUM";
        console.log('  * mediaResolution =', mediaResolution);
        
        // Print feature status summary
        console.log('📝 [Live Backend] Native Audio Feature Status:');
        console.log('  * Affective Dialog:', hasAffectiveDialog ? 'ENABLED ✅' : 'DISABLED ❌');
        console.log('  * Proactive Audio:', hasProactiveAudio ? 'ENABLED ✅' : 'DISABLED ❌');
        console.log('  * Generic Native Audio:', hasGenericNativeAudio ? 'ENABLED ✅' : 'DISABLED ❌');
        console.log('  * Media Resolution:', mediaResolution);
        
        // Validate for potential conflicts
        if (hasAffectiveDialog && hasProactiveAudio) {
            console.warn('⚠️ [Live Backend] WARNING: Both Affective Dialog and Proactive Audio are enabled!');
            console.log('    This is a mutually exclusive configuration, behavior may be unpredictable');
        }
        
        if ((hasAffectiveDialog || hasProactiveAudio) && hasGenericNativeAudio) {
            console.warn('⚠️ [Live Backend] WARNING: Both specific feature and generic nativeAudio=true are set');
            console.log('    This may cause conflicts - the model might ignore the specific feature');
        }
        
        // Overall feature selection summary
        if (hasAffectiveDialog) {
            console.log('🔵 [Live Backend] Using AFFECTIVE DIALOG feature for this session');
        } else if (hasProactiveAudio) {
            console.log('🔵 [Live Backend] Using PROACTIVE AUDIO feature for this session');
        } else if (hasGenericNativeAudio) {
            console.log('🔵 [Live Backend] Using GENERIC NATIVE AUDIO for this session (no specific feature)');
        } else {
            console.log('ℹ️ [Live Backend] No native audio features detected for this session');
        }
        
        // Additional validation to ensure feature selection is properly detected
        if (hasAffectiveDialog && hasProactiveAudio) {
            console.warn('⚠️ [Live Backend] WARNING: Both Affective Dialog and Proactive Audio enabled - these should be mutually exclusive');
        }

       // --- Session Resumption Handle Parsing ---
       if (parsedUrl.searchParams.get('resumehandle')) {
           requestedResumeHandle = parsedUrl.searchParams.get('resumehandle').toString();
           console.log("[Live Backend] Attempting session resumption with handle.");
       }

       // --- Sliding Window and Transcription Parsing ---
       if (parsedUrl.searchParams.get('slidingwindow') !== undefined) {
         slidingWindowEnabled = parsedUrl.searchParams.get('slidingwindow') === 'true';
       }
       if (parsedUrl.searchParams.get('slidingwindowtokens') !== undefined) {
         slidingWindowTokens = parseInt(parsedUrl.searchParams.get('slidingwindowtokens'), 10) || 4000;
       }
       if (parsedUrl.searchParams.get('transcription') !== undefined) {
         transcriptionEnabled = parsedUrl.searchParams.get('transcription') !== 'false';
       }

       // --- Model Parsing ---
       const modelParam = parsedUrl.searchParams.get('model');
       if (modelParam) {
           requestedModel = modelParam;
           console.log(`[Live Backend] Using requested model: ${requestedModel}`);
       } else {
           console.log(`[Live Backend] No model specified, using default: ${requestedModel}`);
       }

   } catch (e) {
       console.error('[Live Backend] Error parsing query parameters:', e);
       try { ws.close(1003, "Invalid URL parameters"); } catch(e){}
       return; // Stop execution
   }

    console.log(`[Live Backend] Effective Modality: ${requestedModality}, Voice: ${requestedVoice || 'N/A'}, System Instruction: ${!!requestedSystemInstruction}`);


   // --- Prepare Config based on Request ---
   const liveConnectConfig = {
       model: requestedModel,
       responseModalities: [requestedModality],
       ...(requestedModality === Modality.AUDIO && requestedVoice && {
           speechConfig: {
               voiceConfig: { prebuiltVoiceConfig: { voiceName: requestedVoice } }
           }
       }),
       ...(Object.keys(requestedRealtimeConfig).length > 0 && {
            realtimeInputConfig: requestedRealtimeConfig
       }),
       ...(requestedSystemInstruction ? {
           systemInstruction: { 
             role: 'system', 
             parts: [{ text: requestedSystemInstruction }] 
           }
       } : {
           systemInstruction: { 
             role: 'system', 
             parts: [{ text: getDefaultSystemInstruction() }] 
           }
       }),
       // Enable unlimited session with context window compression if enabled
       ...(slidingWindowEnabled && {
           contextWindowCompression: {
               slidingWindow: {},
               triggerTokens: String(slidingWindowTokens)
           }
       }),
       // Enable session resumption (always, or just when handle is provided)
       sessionResumption: {
           handle: requestedResumeHandle || null,
       },
       // Only enable output audio transcription if enabled
       ...(transcriptionEnabled && { outputAudioTranscription: {} }),
       // Use media resolution from URL parameter, fallback to medium if not specified
       mediaResolution: mediaResolution,
       // --- Add Tools Configuration based on model capabilities ---
       tools: (function() {
            // Get capabilities for the selected model
            const capabilities = getModelToolCapabilities(requestedModel);
            console.log(`[Live Backend] Model tool capabilities for ${requestedModel}:`, capabilities);
            
            // Use the authentication status we extracted from cookies
            console.log(`[Live Backend] Authentication status for tools: ${isAuthenticated ? 'AUTHENTICATED' : 'NOT AUTHENTICATED'}`);
            if (isAuthenticated) {
                console.log(`[Live Backend] User tokens present, including Google tools in declarations`);
                console.log(`[Live Backend] Token scope: ${userTokens?.scope || 'NO SCOPE'}`);
            } else {
                console.log(`[Live Backend] User tokens missing, using basic tools only`);
            }
            
            // Build tools array based on model capabilities
            const toolsArray = [];
            
            // Add Google Search if supported by the model
            if (capabilities.search) {
                toolsArray.push({ googleSearch: {} });
            }
            
            // Add Code Execution if supported by the model
            if (capabilities.code) {
                toolsArray.push({ codeExecution: {} });
            }
            
            // Add Function declarations if supported by the model
            if (capabilities.functions) {
                toolsArray.push({ functionDeclarations: getToolDeclarations(isAuthenticated) });
            }
            
            console.log(`[Live Backend] Configured tools for ${requestedModel}:`, toolsArray.map(t => Object.keys(t)[0]));
            return toolsArray;
        })(),
   };

   // Add debug log for liveConnectConfig
   console.log('[Live Backend] Final liveConnectConfig for ai.live.connect:', JSON.stringify(liveConnectConfig, null, 2));


   let session;
   try {
       console.log('[Live Backend] Calling ai.live.connect with model:', requestedModel);
       session = await ai.live.connect({
           model: requestedModel, // Use the model requested from frontend
           config: liveConnectConfig,
           callbacks: {
               onopen: () => {
                    const sessionIdShort = session?.conn?.id?.substring(0, 8) ?? 'N/A';
                    console.log(`[Live Backend] Google Session <${sessionIdShort}> OPENED.`);
                    try {
                        if (ws.readyState === WebSocket.OPEN) {
                             ws.send(JSON.stringify({ event: 'connected' }));
                             console.log(`[Live Backend] Sent 'connected' (Google OK) event to client WS <${sessionIdShort}>.`);
                        } else {
                            console.warn(`[Live Backend] Google 'onopen' <${sessionIdShort}> called, but client WS not open. State: ${ws.readyState}`);
                        }
                    } catch (e) {
                         console.error(`[Live Backend] Error sending 'connected' event <${sessionIdShort}> in onopen:`, e);
                    }
                },
                onmessage: async (evt) => {
                    const sessionIdShort = session?.conn?.id?.substring(0, 8) ?? 'N/A';
                    const messageType = Object.keys(evt).find(key => evt[key] !== undefined && key !== 'type') || 'unknown';
                    // Reduce log verbosity for content chunks
                    if (evt.serverContent?.modelTurn?.parts?.some(p => p.inlineData)) {
                        console.log(`[Live Backend] Google <${sessionIdShort}> 'onmessage' [${messageType}]: Received chunk with media data.`);
                    } else {
                    console.log(`[Live Backend] Google <${sessionIdShort}> 'onmessage' [${messageType}]:`, JSON.stringify(evt).substring(0, 150) + "...");
                    }

                    if (evt.serverContent?.outputTranscription) {
                        console.log(`[Live Backend] Received outputTranscription from Gemini <${sessionIdShort}>:`, evt.serverContent.outputTranscription);
                    }

                    try {
                         if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify(evt));
                         } else {
                             console.warn(`[Live Backend] Cannot forward Google message [${messageType}] <${sessionIdShort}> to client WS (not open). State: ${ws.readyState}`);
                         }
                    } catch (sendError) {
                         console.error(`[Live Backend] Error forwarding Google message [${messageType}] <${sessionIdShort}> to client WebSocket:`, sendError);
                    }

                    // --- Handle Tool Calls from Google ---
                    if (evt.toolCall?.functionCalls?.length > 0) {
                        console.log(`[Live Backend] Received toolCall request from Google <${sessionIdShort}>:`, JSON.stringify(evt.toolCall.functionCalls));
                        // Notify frontend that tool call is happening
                         if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ event: 'tool_call_started', calls: evt.toolCall.functionCalls }));
                         }

                         const responsesToSend = [];
                         for (const call of evt.toolCall.functionCalls) {
                             if (toolHandlers[call.name]) {
                                 try {
                                     // Define list of Google tools that need the request object
                                      const isGoogleTool = [
                                          'sendGmail', 'draftGmail', 'listGmailMessages', 'getGmailMessage',
                                          'listCalendarEvents', 'createCalendarEvent', 'getCalendarEvent'
                                      ].includes(call.name);
                                      
                                      let result;
                                       // Get the handler function - handle both object structure and direct function
                                       const handlerFn = typeof toolHandlers[call.name] === 'function' 
                                           ? toolHandlers[call.name] 
                                           : toolHandlers[call.name]?.handler;
                                       
                                       if (!handlerFn) {
                                           throw new Error(`Handler function not found for tool: ${call.name}`);
                                       }
                                       
                                       if (isGoogleTool) {
                                           // For Google tools, pass the req object and safe args
                                           if (!req.isAuthenticated || !req.userTokens) {
                                               throw new Error('Authentication required for this Google tool');
                                           }
                                           const safeArgs = call.args && typeof call.args === 'object' ? call.args : {};
                                           result = await handlerFn(req, safeArgs);
                                       } else {
                                           // For other tools, just pass the args
                                           result = await handlerFn(call.args || {});
                                       }
                                       
                                       // Process image generation separately before adding to responses
                                       let responseResult = result;
                                       if ((call.name === 'generateImage' || call.name === 'editImage') && result?.imageData) {
                                           // Create a simplified version of the result for Google
                                           responseResult = {
                                               message: 'Image generated successfully',
                                               status: 'success',
                                               timestamp: new Date().toISOString()
                                           };
                                       }
                                       
                                      console.log(`[Live Backend] Tool ${call.name} executed. Result:`, 
                                          (call.name === 'generateImage' || call.name === 'editImage') ? 'Image data (not logged)' : JSON.stringify(responseResult));
                                      responsesToSend.push({ id: call.id, name: call.name, response: { result: responseResult } });

                                     // --- Check for Map Display Data and send separate event ---
                                     if (result?._mapDisplayData && ws.readyState === WebSocket.OPEN) {
                                        console.log(`[Live Backend] Sending map_display_update event for tool ${call.name} with data:`, JSON.stringify(result._mapDisplayData));
                                        ws.send(JSON.stringify({
                                            event: 'map_display_update',
                                            mapData: result._mapDisplayData // Send only the map-specific data
                                        }));
                                     }
                                     // --- End Map Display Check ---
                                     
                                     // --- Check for Image Generation Data and send separate event ---
                                     if ((call.name === 'generateImage' || call.name === 'editImage') && 
                                         result?.imageData && ws.readyState === WebSocket.OPEN) {
                                        console.log(`[Live Backend] Sending ${call.name === 'generateImage' ? 'imageGenerated' : 'imageEdited'} event with data`);
                                        ws.send(JSON.stringify({
                                            event: call.name === 'generateImage' ? 'imageGenerated' : 'imageEdited',
                                            imageData: result.imageData,
                                            mimeType: result.mimeType || 'image/png',
                                            description: result.description || ''
                                        }));
                                     }
                                     // --- End Image Generation Check ---

                                     // Notify frontend of custom tool result (send the non-map part)
                                     if (ws.readyState === WebSocket.OPEN) {
                                        // Clone result and remove map data before sending to frontend as standard tool result
                                        const resultForFrontend = { ...result };
                                        delete resultForFrontend._mapDisplayData;
                                        ws.send(JSON.stringify({ event: 'tool_call_result', name: call.name, result: resultForFrontend }));
                                     }
                                 } catch (toolError) {
                                     console.error(`[Live Backend] Error executing custom tool ${call.name} <${sessionIdShort}>:`, toolError);
                                     responsesToSend.push({ id: call.id, name: call.name, response: { error: toolError.message || 'Execution failed' } });
                                      if (ws.readyState === WebSocket.OPEN) {
                                          ws.send(JSON.stringify({ event: 'tool_call_error', name: call.name, error: toolError.message || 'Execution failed' }));
                                      }
                                 }
                             }
                         }
                         if (responsesToSend.length > 0) {
                             console.log(`[Live Backend] Sending toolResponse back to Google <${sessionIdShort}>.`);
                             await session.sendToolResponse({ functionResponses: responsesToSend });
                         }
                    }

                    // --- Forward serverContent (including potential native tool results like codeExecutionResult) ---
                    if (evt.serverContent) {
                        // Existing logic to forward text/audio...
                        // Add check for codeExecutionResult if needed for specific UI display
                        if (evt.serverContent.modelTurn?.parts?.some(p => p.codeExecutionResult)) {
                            console.log(`[Live Backend] Forwarding serverContent with codeExecutionResult <${sessionIdShort}>.`);
                        }
                    }

                    // --- Forward Session Resumption Updates ---
                    if (evt.sessionResumptionUpdate) {
                        console.log(`[Live Backend] Forwarding sessionResumptionUpdate to client <${sessionIdShort}>.`);
                    }
                },
                 onerror: e => {
                     const sessionIdShort = session?.conn?.id?.substring(0, 8) ?? 'N/A'; // Safer logging
                     console.error(`--- [Live Backend] Google Session <${sessionIdShort}> ERROR ---`);
                     console.error(e); // Log the full error object
                     console.error('--- End Google Session Error ---');
                      try {
                          if (ws.readyState === WebSocket.OPEN) {
                               ws.send(JSON.stringify({ event: 'error', message: e.message || 'Unknown Google live session error' }));
                          }
                     } catch (wsErr) {
                         console.error(`[Live Backend] Error sending Google error event <${sessionIdShort}> to client:`, wsErr);
                     }
                     try { ws.close(1011, "Google session error"); } catch (closeErr) {}
                 },
                 onclose: (closeEvent) => {
                    const sessionIdShort = session?.conn?.id?.substring(0, 8) ?? 'N/A'; // Safer logging
                    const code = closeEvent?.code || 'N/A';
                    const reason = closeEvent?.reason || 'N/A';
                    console.log(`--- [Live Backend] Google Session <${sessionIdShort}> CLOSED --- Code: ${code}, Reason: ${reason}`);
                     try {
                         if (ws.readyState === WebSocket.OPEN) {
                             ws.send(JSON.stringify({ event: 'closed', code: code, reason: reason }));
                         } else {
                             console.warn(`[Live Backend] Google 'onclose' <${sessionIdShort}> fired, but client WS already closed. State: ${ws.readyState}`);
                         }
                    } catch (wsErr) {
                        console.error(`[Live Backend] Error sending 'closed' event <${sessionIdShort}> to client:`, wsErr);
                    }
                     try { if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) ws.close(1000, "Google session closed"); } catch(e){}
                     sessions.delete(ws);
                 }
            }
        });
        const initialSessionId = session?.conn?.id?.substring(0, 8) ?? 'N/A';
        console.log(`[Live Backend] Google session <${initialSessionId}> connection initiated (ai.live.connect returned).`);

    } catch (connectError) {
         console.error('--- [Live Backend] CRITICAL: Error during ai.live.connect call ---');
         console.error(connectError);
         console.error('--- End Connect Error ---');
          try {
             if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                 ws.send(JSON.stringify({ event: 'error', message: `Backend failed during Google Live API connection: ${connectError.message || 'Unknown SDK error'}` }));
                 ws.close(1011, "Backend connection error to Google");
             }
         } catch(e){ console.error("[Live Backend] Error handling SDK connection error:", e); }
        return;
    }

    // ... session validation checks ...
    if (!session || !session.conn) {
        console.error("[Live Backend] CRITICAL: session or session.conn is null/undefined after ai.live.connect. Aborting setup.");
        try { ws.close(1011, "Backend session initialization error"); } catch(e){}
        return;
    }

     if (!session.conn.id) {
        console.warn("[Live Backend] session.conn.id is null/undefined after successful connect. Proceeding without ID logging.");
        // Proceed, but logging will show N/A
     }
    // ---> END FIX <---


    const sessionId = session.conn?.id?.substring(0, 8) ?? 'N/A';
    console.log(`[Live Backend] Client WS <${sessionId}> connected, associated with Google session. Setting up message handlers.`);
    sessions.set(ws, session);


    // --- REFINED Client WebSocket Message Handler ---
    ws.on('message', async (message) => {
       const currentSession = sessions.get(ws);
       const currentSessionId = currentSession?.conn?.id?.substring(0, 8) ?? 'N/A';

       if (!currentSession) {
         console.warn(`[Live Backend] Received message from client (ID: N/A - session not found) for closed session.`);
         ws.close(1011, 'No active session found');
         return;
       }

       // We expect messages to be Buffers (either raw PCM or JSON strings)
       if (!(message instanceof Buffer)) {
          console.warn(`[Live Backend] Received unexpected non-Buffer message type from client <${currentSessionId}>: ${typeof message}. Ignoring.`);
          return;
       }

       let parsedMessage;
       let isJson = false;

       // Attempt to parse the Buffer as JSON text
       try {
           const textData = message.toString('utf8');
           parsedMessage = JSON.parse(textData);
           isJson = true;
       } catch (e) {
           // JSON parse failed, assume it's raw audio PCM
           isJson = false;
       }

       try {
           if (isJson && parsedMessage) {
                // --- Handle JSON messages ---
                if (parsedMessage.type === 'text' && typeof parsedMessage.text === 'string') {
                    // Handle Text Input
                    console.log(`[Live Backend] Received TEXT JSON from client <${currentSessionId}>. Sending via sendClientContent.`);
                    await currentSession.sendClientContent({
                        turns: [{ role: 'user', parts: [{ text: parsedMessage.text.trim() }] }]
                    });
                    console.log(`[Live Backend] Sent Text data via sendClientContent for <${currentSessionId}>.`);

                } else if (parsedMessage.type === 'video_chunk' && parsedMessage.chunk) {
                    // Handle Video Chunk Input (received as JSON from frontend)
                    console.log(`[Live Backend] Received VIDEO CHUNK JSON from client <${currentSessionId}>. Sending via sendRealtimeInput.`);
                     // Ensure the chunk format matches what sendRealtimeInput expects
                     // It expects { video: { data: base64string, mimeType: 'image/jpeg' } }
                     // Our frontend sends { type: 'video_chunk', chunk: { mimeType: 'image/jpeg', data: base64data } }
                     console.log('RECEIVED video data**')
                     console.log(parsedMessage)
                     if (parsedMessage.chunk.data && parsedMessage.chunk.mimeType) {
                        await currentSession.sendRealtimeInput({
                            video: {
                                data: parsedMessage.chunk.data,
                                mimeType: parsedMessage.chunk.mimeType
                            }
                        });
                        console.log(`[Live Backend] Sent Video Chunk data via sendRealtimeInput for <${currentSessionId}>.`);
                     } else {
                         console.warn(`[Live Backend] Received video_chunk JSON but chunk data/mimeType missing <${currentSessionId}>.`);
                     }

                } else if (parsedMessage.type === 'screen_chunk' && parsedMessage.chunk) {
                    // Handle Screen Share Chunk Input
                    console.log(`[Live Backend] Received SCREEN CHUNK JSON from client <${currentSessionId}>. Sending via sendRealtimeInput.`);
                     if (parsedMessage.chunk.data && parsedMessage.chunk.mimeType) {
                        await currentSession.sendRealtimeInput({
                            video: { // Google Live API likely expects screen share frames as 'video' type input
                                data: parsedMessage.chunk.data,
                                mimeType: parsedMessage.chunk.mimeType
                            }
                        });
                        console.log(`[Live Backend] Sent Screen Chunk data via sendRealtimeInput for <${currentSessionId}>.`);
                     } else {
                         console.warn(`[Live Backend] Received screen_chunk JSON but chunk data/mimeType missing <${currentSessionId}>.`);
                     }

                } else {
                    // Unknown JSON structure
                    console.warn(`[Live Backend] Received Buffer containing unrecognized JSON structure <${currentSessionId}>:`, parsedMessage);
                }
           } else {
                // --- Handle Raw Binary Data (Assume Audio PCM) ---
                console.log(`[Live Backend] Received RAW BUFFER (Audio PCM assumed) from client <${currentSessionId}>. Size: ${message.length}. Sending via sendRealtimeInput.`);
                const base64Pcm = message.toString('base64');
                await currentSession.sendRealtimeInput({
                     audio: { data: base64Pcm, mimeType: 'audio/pcm' } // Assuming PCM if not JSON
                });
                console.log(`[Live Backend] Sent Audio PCM data via sendRealtimeInput for <${currentSessionId}>.`);
           }
       } catch (error) {
           console.error(`[Live Backend] Error processing client message or sending to Google <${currentSessionId}>:`, error);
           // Optionally send an error back to the client if appropriate
           // ws.send(JSON.stringify({ event: 'error', message: 'Backend processing error' }));
       }
    });
    // --- END REFINED Client WebSocket Message Handler ---

    // --- Client WebSocket Close Handler ---
    ws.on('close', (code, reason) => {
        const reasonString = reason?.toString() ?? 'No reason given';
        console.log(`[Live Backend] Client WebSocket connection closed. Code: ${code}, Reason: "${reasonString}"`);
        const currentSession = sessions.get(ws);
        const currentSessionId = currentSession?.conn?.id?.substring(0, 8) ?? 'N/A'; // Safer logging
        if (currentSession) {
            console.log(`[Live Backend] Closing associated Google session <${currentSessionId}> due to client disconnect.`);
             try {
                 const googleWsState = currentSession.conn?.readyState;
                 if (googleWsState === WebSocket.OPEN || googleWsState === WebSocket.CONNECTING) {
                    currentSession.close();
                    console.log(`[Live Backend] Called close() on Google session <${currentSessionId}>.`);
                 } else {
                     console.log(`[Live Backend] Google session <${currentSessionId}> was not OPEN or CONNECTING (State: ${googleWsState}). Not calling close().`);
                 }
             } catch (closeError) {
                  console.error(`[Live Backend] Error closing Google API session <${currentSessionId}>:`, closeError);
             } finally {
                 sessions.delete(ws); // Remove from map
                 console.log(`[Live Backend] Session <${currentSessionId}> removed from active map.`);
             }
        } else {
            console.log("[Live Backend] Client WS closed, but no associated Google session found in map (already cleaned up?).");
        }
  });

    // --- Client WebSocket Error Handler ---
    ws.on('error', (error) => {
        console.error('[Live Backend] Client WebSocket error:', error);
        const currentSession = sessions.get(ws);
        const currentSessionId = currentSession?.conn?.id?.substring(0, 8) ?? 'N/A'; // Safer logging
        if (currentSession) {
            console.error(`[Live Backend] Closing associated Google session <${currentSessionId}> due to client WS error.`);
            try {
                  const googleWsState = currentSession.conn?.readyState;
                  if (googleWsState === WebSocket.OPEN || googleWsState === WebSocket.CONNECTING) {
                      currentSession.close();
                  }
              } catch (closeError) {
                   console.error(`[Live Backend] Error closing Google API session <${currentSessionId}> on client WS error:`, closeError);
              } finally {
                  sessions.delete(ws);
              }
        }
        try { if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING ) ws.terminate(); } catch(e){}
         console.error('[Live Backend] Client WebSocket terminated due to error.');
  });

  console.log(`[Live Backend] handleLiveConnection setup complete for <${sessionId}>.`);
} catch (outerError) {
    console.error('[Live Backend] Uncaught error in handleLiveConnection:', outerError);
    try { 
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1011, "Unexpected server error"); 
      }
    } catch(e){}
  }
} // --- End of handleLiveConnection ---

// Start server
server.listen(port,()=>{
  console.log(`Server listening on port ${port}`);
  console.log('REST: /health, /models, /voices, /voices/select, /system, /tools, /tools/invoke, /files, /chat, /chat/stream, /chat/function-result');
  console.log('WS: ws://<host>/live[ /text /audio /video ]');
});


