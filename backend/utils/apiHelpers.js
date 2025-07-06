// utils/apiHelpers.js
import { 
    HarmCategory, 
    HarmBlockThreshold, 
    FunctionCallingConfigMode,
    Modality,
    DynamicRetrievalConfigMode
  } from '@google/genai';
  import fs from 'fs';
  import path from 'path';
  import { filterGeminiSupportedFiles } from './supportedFileTypes.js';
  import { customToolNames, getToolDeclarations } from '../services/tools/index.js';
  
  // Helper: check if request can use context caching
  export function canUseContextCaching(contents, config) {
    // Use caching for requests with:
    // 1. Any files (expensive to process repeatedly)
    // 2. Long system instructions
    // 3. Large chat history (>5 messages)
    // 4. Force caching via config
    
    // Count total files across all contents
    let totalFiles = 0;
    contents.forEach(content => {
      if (content.parts) {
        content.parts.forEach(part => {
          if (part.fileData && Array.isArray(part.fileData)) {
            totalFiles += part.fileData.length;
          }
        });
      }
    });
    
    const hasFiles = totalFiles > 0;
    const hasLongSystemInstruction = config?.systemInstruction && config.systemInstruction.length > 200;
    const hasLargeChatHistory = contents.length > 5;
    const forceCaching = config?.enableCaching === true;
    
    console.log(`[canUseContextCaching] Files: ${totalFiles}, System instruction: ${config?.systemInstruction?.length || 0} chars, Chat history: ${contents.length} messages, Force: ${forceCaching}`);
    
    return hasFiles || hasLongSystemInstruction || hasLargeChatHistory || forceCaching;
  }
  
  // Helper: build API request for /chat and /chat/stream
  export function buildApiRequest(body) {
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
          if (part.functionResponse) {
            // Function responses should be passed through as-is
            newParts.push(part);
          } else if (part.fileData && Array.isArray(part.fileData)) {
            fileDataArray = part.fileData; // Store fileData to be processed
          } else {
            newParts.push(part); // Keep non-fileData parts
          }
        });
  
        if (fileDataArray) {
          // Filter out unsupported file types before processing
          const supportedFiles = filterGeminiSupportedFiles(fileDataArray);
          
          if (supportedFiles.length < fileDataArray.length) {
            console.warn(`[buildApiRequest] Filtered out ${fileDataArray.length - supportedFiles.length} unsupported files`);
          }
          
          supportedFiles.forEach(file => {
            if (file.uri && file.uri.trim() !== '') {
              // Use Google Files API URI directly - this works for all supported file types
              console.log(`[buildApiRequest] Adding file with URI: ${file.uri}`);
              newParts.push({
                fileData: {
                  mimeType: file.mimetype || file.type,
                  fileUri: file.uri
                }
              });
            } else if (file.id && file.type && file.type.startsWith('image/')) {
              // Fallback for legacy local file storage (deprecated)
              try {
                const filePath = path.join(process.cwd(), 'uploads', file.id);
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
                }
              } catch (e) {
                console.error(`[buildApiRequest] Error processing image file ${file.id}:`, e);
              }
            } else {
              console.warn(`[buildApiRequest] File missing URI or unsupported format:`, {
                id: file.id,
                uri: file.uri,
                type: file.type || file.mimetype,
                originalname: file.originalname
              });
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
      
      // Handle function calling (custom tools)
      if (config.enableFunctionCalling === true && config.selectedTools && Array.isArray(config.selectedTools)) {
        try {
          // Get available tools from the tools service
          const availableTools = getToolDeclarations(true); // Assuming authenticated for now
          
          console.log('[buildApiRequest] Available tools count:', availableTools.length);
          console.log('[buildApiRequest] Selected tools:', config.selectedTools);
          
          // Filter tools based on selected tool names with better error handling
          const selectedToolDeclarations = [];
          
          for (let i = 0; i < availableTools.length; i++) {
            const tool = availableTools[i];
            console.log(`[buildApiRequest] Processing tool ${i}:`, tool ? (tool.name || 'no name') : 'null/undefined');
            
            if (tool && typeof tool.name === 'string' && config.selectedTools.includes(tool.name)) {
              selectedToolDeclarations.push(tool);
            }
          }
          
          if (selectedToolDeclarations.length > 0) {
            console.log('[buildApiRequest] Using selected function calling tools:', selectedToolDeclarations.map(t => t.name));
            apiRequest.config.tools = [{ functionDeclarations: selectedToolDeclarations }];
            
            // Add function calling configuration if specified
            if (config.functionCallingMode || config.allowedFunctionNames) {
              apiRequest.config.toolConfig = {
                functionCallingConfig: {}
              };
              
              // Set function calling mode (AUTO, ANY, NONE)
              if (config.functionCallingMode) {
                apiRequest.config.toolConfig.functionCallingConfig.mode = config.functionCallingMode;
                console.log('[buildApiRequest] Set function calling mode:', config.functionCallingMode);
              }
              
              // Set allowed function names for ANY mode
              if (config.allowedFunctionNames && Array.isArray(config.allowedFunctionNames)) {
                apiRequest.config.toolConfig.functionCallingConfig.allowedFunctionNames = config.allowedFunctionNames;
                console.log('[buildApiRequest] Set allowed function names:', config.allowedFunctionNames);
              }
            }
          } else {
            console.log('[buildApiRequest] No valid tools found for selected tools:', config.selectedTools);
          }
        } catch (error) {
          console.error('[buildApiRequest] Error processing function calling:', error);
          // Don't fail the whole request, just skip function calling
        }
      }
      // Only set tools configuration if we have tools or explicit tool preferences
      else if (config.tools && Array.isArray(config.tools)) {
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
  
  // Helper: build API request with optional caching support
  export async function buildApiRequestWithCaching(body, cacheService = null) {
    const apiRequest = buildApiRequest(body);
    
    // Check if we should use caching
    if (!cacheService || !canUseContextCaching(body.contents, body.config)) {
      return apiRequest;
    }
    
    try {
      // Extract files and system instruction for cache matching
      const files = [];
      const systemInstruction = body.config?.systemInstruction || '';
      
      // Collect files from contents
      body.contents.forEach(content => {
        if (content.parts) {
          content.parts.forEach(part => {
            if (part.fileData && Array.isArray(part.fileData)) {
              files.push(...part.fileData);
            }
          });
        }
      });
      
      // Try to find existing suitable cache
      const suitableCache = cacheService.findSuitableCache(systemInstruction, files);
      
      if (suitableCache) {
        console.log(`[buildApiRequestWithCaching] Using existing cache: ${suitableCache.name}`);
        // Use cached content instead of building full request
        return {
          model: apiRequest.model,
          config: {
            ...apiRequest.config,
            cachedContent: suitableCache.name
          },
          contents: body.contents.slice(-2) // Only send recent messages when using cache
        };
      }
      
      // If we have files or long system instruction, create a new cache
      if (files.length > 0 || systemInstruction.length > 200) {
        console.log(`[buildApiRequestWithCaching] Creating new cache for ${files.length} files and system instruction (${systemInstruction.length} chars)`);
        
        try {
          const cache = await cacheService.createCache(
            apiRequest.model,
            systemInstruction,
            files,
            2 // 2 hours TTL
          );
          
          console.log(`[buildApiRequestWithCaching] Created cache: ${cache.name}`);
          
          // Use the new cache
          return {
            model: apiRequest.model,
            config: {
              ...apiRequest.config,
              cachedContent: cache.name
            },
            contents: body.contents.slice(-2) // Only send recent messages when using cache
          };
        } catch (cacheError) {
          console.warn(`[buildApiRequestWithCaching] Failed to create cache, using normal request:`, cacheError.message);
          return apiRequest; // Fall back to normal request
        }
      }
      
      return apiRequest;
    } catch (error) {
      console.error(`[buildApiRequestWithCaching] Error in caching logic:`, error);
      return apiRequest; // Fall back to normal request
    }
  }