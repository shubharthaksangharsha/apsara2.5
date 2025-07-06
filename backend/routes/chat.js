// routes/chat.js
import express from 'express';
import { buildApiRequest } from '../utils/apiHelpers.js';
import { toolHandlers } from '../services/tools/index.js';

const router = express.Router();

// Standard chat endpoint
router.post('/', async (req, res) => {
  const modelId = req.body.modelId || 'gemini-2.0-flash';
  try {
    // Imagen 3
    if (modelId === 'imagen-3.0-generate-002') {
      const prompt = req.body.contents.find(c => c.role === 'user').parts.find(p => p.text).text;
      const cfg = {}, gc = req.body.config?.generationConfig;
      if (gc?.numberOfImages) cfg.numberOfImages = gc.numberOfImages;
      if (gc?.aspectRatio) cfg.aspectRatio = gc.aspectRatio;
      if (gc?.personGeneration) cfg.personGeneration = gc.personGeneration;
      const result = await req.app.get('ai').models.generateImages({ model: modelId, prompt, config: cfg });
      const parts = result.generatedImages.map(img => ({ inlineData: { mimeType: 'image/png', data: img.image.imageBytes }}));
      return res.json({ response: parts });
    }
    // Gemini image‐gen
    if (modelId === 'gemini-2.0-flash-preview-image-generation') {
      const reqA = buildApiRequest(req.body);
      const result = await req.app.get('ai').models.generateContent(reqA);
      const c = result.candidates[0];
      if (['SAFETY', 'RECITATION'].includes(c.finishReason)) return res.status(400).json({});
      return res.json({
        response: c.content.parts,
        usageMetadata: result.usageMetadata,
        finishReason: c.finishReason,
        safetyRatings: c.safetyRatings,
        groundingMetadata: c.groundingMetadata
      });
    }
    // Default Gemini
    const apiRequest = buildApiRequest(req.body);
    console.log(`[POST /chat] Request to Google API (Model: ${modelId}):`, JSON.stringify(apiRequest, null, 2));
    let result = await req.app.get('ai').models.generateContent(apiRequest);
    console.log(`[POST /chat] Response from Google API:`, JSON.stringify(result, null, 2));
    
    // Handle function calls if present (supports both parallel and compositional)
    const functionCalls = result.candidates[0].content.parts.filter(part => part.functionCall);
    let imagePartsFromFunctions = [];
    let finalResponseParts = [];
    
    if (functionCalls && functionCalls.length > 0) {
      console.log(`[POST /chat] Processing ${functionCalls.length} function calls${functionCalls.length > 1 ? ' (parallel)' : ''}`);
      
      // Create a new conversation with function results
      const updatedContents = [...apiRequest.contents];
      
      // Add the assistant's response with function calls
      updatedContents.push({
        role: 'model',
        parts: result.candidates[0].content.parts
      });
      
      // Execute function calls in parallel for better performance
      const functionResults = await Promise.allSettled(
        functionCalls.map(async (part) => {
          const functionCall = part.functionCall;
          console.log(`[POST /chat] Executing function: ${functionCall.name}`);
          
          try {
            const handler = toolHandlers[functionCall.name];
            if (!handler) {
              console.error(`[POST /chat] No handler found for function: ${functionCall.name}`);
              return { functionCall, result: { error: `Function '${functionCall.name}' not found` } };
            } else {
              const result = await handler(functionCall.args || {});
              return { functionCall, result };
            }
          } catch (error) {
            console.error(`[POST /chat] Error executing function ${functionCall.name}:`, error);
            return { functionCall, result: { error: `Function execution failed: ${error.message}` } };
          }
        })
      );
      
      // Add all function responses to conversation and collect image data
      // Special handling for image generation tools - don't send image data back to model
      let hasImageGeneration = false;
      functionResults.forEach(({ status, value }) => {
        if (status === 'fulfilled') {
          const { functionCall, result } = value;
          
          // Check if this is an image generation or editing tool
          const isImageTool = functionCall.name === 'generateImage' || functionCall.name === 'editImage';
          
          if (isImageTool && result && result.imageData && result.mimeType) {
            console.log(`[POST /chat] Found image data from function: ${functionCall.name}, not sending back to model`);
            hasImageGeneration = true;
            
            // Add image data for display
            imagePartsFromFunctions.push({
              inlineData: {
                mimeType: result.mimeType,
                data: result.imageData
              }
            });
            
            // Add a simple text response instead of the full image data
            updatedContents.push({
              role: 'user',
              parts: [{
                functionResponse: {
                  name: functionCall.name,
                  response: { 
                    result: {
                      status: result.status,
                      message: result.message,
                      description: result.description || 'Image generated successfully'
                    }
                  }
                }
              }]
            });
          } else {
            // For non-image tools, send full result
            updatedContents.push({
              role: 'user',
              parts: [{
                functionResponse: {
                  name: functionCall.name,
                  response: { result }
                }
              }]
            });
          }
        } else {
          console.error(`[POST /chat] Function execution failed:`, status);
        }
      });
      
      // For image generation tools, skip the follow-up request to avoid token limits
      if (hasImageGeneration) {
        console.log(`[POST /chat] Skipping follow-up request for image generation tool`);
        // Use the description from the image generation result as the response
        const imageResult = functionResults.find(({ status, value }) => 
          status === 'fulfilled' && 
          (value.functionCall.name === 'generateImage' || value.functionCall.name === 'editImage')
        );
        
        if (imageResult && imageResult.value.result.description) {
          finalResponseParts = [{ text: imageResult.value.result.description }];
        } else {
          finalResponseParts = [{ text: 'Image generated successfully.' }];
        }
      } else {
        // Make another request with function results for non-image tools
        const followUpRequest = {
          ...apiRequest,
          contents: updatedContents
        };
        
        console.log(`[POST /chat] Making follow-up request with function results`);
        result = await req.app.get('ai').models.generateContent(followUpRequest);
        console.log(`[POST /chat] Follow-up response:`, JSON.stringify(result, null, 2));
      }
    } else {
      // No function calls - extract response parts normally
      const c = result.candidates[0];
      if (['SAFETY', 'RECITATION'].includes(c.finishReason)) return res.status(400).json({});
      
      // Check if the primary response is within parts (most common case)
      if (c.content?.parts && Array.isArray(c.content.parts)) {
          finalResponseParts = c.content.parts;
      } else if (result.text) { // Fallback for simple text responses
          finalResponseParts.push({ text: result.text });
      }
    }

    // Add any image parts from function results to the final response
    if (imagePartsFromFunctions && imagePartsFromFunctions.length > 0) {
      console.log(`[POST /chat] Adding ${imagePartsFromFunctions.length} image parts to final response`);
      finalResponseParts = [...finalResponseParts, ...imagePartsFromFunctions];
    }

    // Return the full parts array structure
    return res.json({
      response: finalResponseParts, // Send the array of parts (including images)
      usageMetadata: result.usageMetadata,
      finishReason: c.finishReason,
      safetyRatings: c.safetyRatings,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Streaming chat endpoint
router.post('/stream', async (req, res) => {
  const modelId = req.body.modelId || 'gemini-2.0-flash';
  try {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const apiRequest = buildApiRequest(req.body);
    console.log(`[POST /chat/stream] Request to Google API (Model: ${modelId}):`, JSON.stringify(apiRequest, null, 2));
    
    // Start with streaming the initial request
    const initialStream = await req.app.get('ai').models.generateContentStream(apiRequest);
    let functionCallsToExecute = [];
    let streamEnded = false;
    let allStreamedParts = []; // Collect all parts for function call detection
    
    // Process initial stream
    for await (const chunk of initialStream) {
      console.log(`[POST /chat/stream] Processing initial chunk:`, JSON.stringify(chunk, null, 2));
      const candidate = chunk.candidates?.[0];
      if (!candidate) continue;

      // Stream content parts as they come
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          // Collect all parts for function call detection
          allStreamedParts.push(part);
          
          let eventData = {};
          if (part.text) {
            eventData.text = part.text;
          }
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
            res.write(dataString);
          }
        }
      }

      if (candidate.groundingMetadata) {
        const gmDataString = `event: grounding\ndata: ${JSON.stringify(candidate.groundingMetadata)}\n\n`;
        res.write(gmDataString);
      }

      if (candidate.finishReason && candidate.finishReason !== 'FINISH_REASON_UNSPECIFIED') {
        streamEnded = true;
        // Check for function calls in the collected parts
        const functionCallParts = allStreamedParts.filter(part => part.functionCall);
        if (functionCallParts.length > 0) {
          functionCallsToExecute = functionCallParts.map(part => part.functionCall);
          console.log(`[POST /chat/stream] Found ${functionCallsToExecute.length} function calls to execute`);
        }
        
        // Don't send done event yet if we have function calls to execute
        if (functionCallsToExecute.length === 0) {
          const finalData = {
            finishReason: candidate.finishReason,
            usageMetadata: chunk.usageMetadata,
            safetyRatings: candidate.safetyRatings
          };
          const finalDataString = `event: done\ndata: ${JSON.stringify(finalData)}\n\n`;
          res.write(finalDataString);
        }
        break;
      }
    }

    // Handle function calls if present (supports both parallel and compositional)
    if (functionCallsToExecute.length > 0) {
      console.log(`[POST /chat/stream] Processing ${functionCallsToExecute.length} function calls${functionCallsToExecute.length > 1 ? ' (parallel)' : ''}`);
      
      // Create updated conversation with function results
      const updatedContents = [...apiRequest.contents];
      
      // Add the assistant's response with function calls
      // Use all the streamed parts, including the function calls
      updatedContents.push({
        role: 'model',
        parts: allStreamedParts
      });
      
      // Execute function calls in parallel and send events to client
      const functionResults = await Promise.allSettled(
        functionCallsToExecute.map(async (functionCall) => {
          console.log(`[POST /chat/stream] Executing function: ${functionCall.name}`);
          
          // Send function call event to client
          const fcDataString = `event: function_call\ndata: ${JSON.stringify({ 
            functionCall: functionCall,
            status: 'executing' 
          })}\n\n`;
          res.write(fcDataString);
          
          try {
            const handler = toolHandlers[functionCall.name];
            if (!handler) {
              console.error(`[POST /chat/stream] No handler found for function: ${functionCall.name}`);
              return { functionCall, result: { error: `Function '${functionCall.name}' not found` } };
            } else {
              const result = await handler(functionCall.args || {});
              return { functionCall, result };
            }
          } catch (error) {
            console.error(`[POST /chat/stream] Error executing function ${functionCall.name}:`, error);
            return { functionCall, result: { error: `Function execution failed: ${error.message}` } };
          }
        })
      );
      
      // Send function result events and add to conversation
      // Special handling for image generation tools
      let hasImageGeneration = false;
      functionResults.forEach(({ status, value }) => {
        if (status === 'fulfilled') {
          const { functionCall, result } = value;
          
          // Check if this is an image generation or editing tool
          const isImageTool = functionCall.name === 'generateImage' || functionCall.name === 'editImage';
          
          if (isImageTool && result && result.imageData && result.mimeType) {
            console.log(`[POST /chat/stream] Found image data from function: ${functionCall.name}, sending directly to client`);
            hasImageGeneration = true;
            
            // 1. Send function result event first (✅ generateImage completed)
            const resultDataString = `event: function_result\ndata: ${JSON.stringify({ 
              functionCall: functionCall, 
              result: result,
              status: 'completed'
            })}\n\n`;
            res.write(resultDataString);
            res.write('\n'); // Ensure newline after event
            // 2. Send the description as text response
            if (result.description) {
              const textDataString = `data: ${JSON.stringify({
                text: result.description
              })}\n\n`;
              res.write(textDataString);
            }
            
            // 3. Send image data last
            const imageDataString = `data: ${JSON.stringify({
              inlineData: {
                mimeType: result.mimeType,
                data: result.imageData
              }
            })}\n\n`;
            res.write(imageDataString);
            
            // Add simplified response to conversation (without image data)
            updatedContents.push({
              role: 'user',
              parts: [{
                functionResponse: {
                  name: functionCall.name,
                  response: { 
                    result: {
                      status: result.status,
                      message: result.message,
                      description: result.description || 'Image generated successfully'
                    }
                  }
                }
              }]
            });
          } else {
            // For non-image tools, send full result
            updatedContents.push({
              role: 'user',
              parts: [{
                functionResponse: {
                  name: functionCall.name,
                  response: { result }
                }
              }]
            });
            
            // Send function result event to client
            const resultDataString = `event: function_result\ndata: ${JSON.stringify({ 
              functionCall: functionCall, 
              result: result,
              status: 'completed'
            })}\n\n`;
            res.write(resultDataString);
          }
        } else {
          console.error(`[POST /chat/stream] Function execution failed:`, status);
        }
      });
      
      // For image generation tools, skip the follow-up request to avoid token limits
      if (hasImageGeneration) {
        console.log(`[POST /chat/stream] Skipping follow-up request for image generation tool`);
        // Send done event immediately
        const finalData = {
          finishReason: 'STOP',
          usageMetadata: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
          safetyRatings: []
        };
        const finalDataString = `event: done\ndata: ${JSON.stringify(finalData)}\n\n`;
        res.write(finalDataString);
      } else {
        // Make follow-up request with function results and stream that response for non-image tools
        const followUpRequest = {
          ...apiRequest,
          contents: updatedContents
        };
        
        console.log(`[POST /chat/stream] Making follow-up request with function results`);
        console.log(`[POST /chat/stream] Follow-up request contents:`, JSON.stringify(followUpRequest.contents, null, 2));
        
        try {
        const followUpStream = await req.app.get('ai').models.generateContentStream(followUpRequest);
        console.log(`[POST /chat/stream] Follow-up stream created successfully`);
        
        let followUpChunkCount = 0;
        for await (const chunk of followUpStream) {
          followUpChunkCount++;
          console.log(`[POST /chat/stream] Processing follow-up chunk ${followUpChunkCount}:`, JSON.stringify(chunk, null, 2));
          
          const candidate = chunk.candidates?.[0];
          if (!candidate) {
            console.log(`[POST /chat/stream] No candidate in follow-up chunk ${followUpChunkCount}`);
            continue;
          }

          if (candidate.content?.parts) {
            console.log(`[POST /chat/stream] Follow-up chunk ${followUpChunkCount} has ${candidate.content.parts.length} parts`);
            for (const part of candidate.content.parts) {
              let eventData = {};
              if (part.text) {
                eventData.text = part.text;
                console.log(`[POST /chat/stream] Sending follow-up text: ${part.text}`);
              }
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
                res.write(dataString);
                console.log(`[POST /chat/stream] Wrote follow-up data: ${dataString.trim()}`);
              }
            }
          }

          if (candidate.groundingMetadata) {
            const gmDataString = `event: grounding\ndata: ${JSON.stringify(candidate.groundingMetadata)}\n\n`;
            res.write(gmDataString);
          }

          if (candidate.finishReason && candidate.finishReason !== 'FINISH_REASON_UNSPECIFIED') {
            console.log(`[POST /chat/stream] Follow-up stream finished with reason: ${candidate.finishReason}`);
            const finalData = {
              finishReason: candidate.finishReason,
              usageMetadata: chunk.usageMetadata,
              safetyRatings: candidate.safetyRatings
            };
            const finalDataString = `event: done\ndata: ${JSON.stringify(finalData)}\n\n`;
            res.write(finalDataString);
            console.log(`[POST /chat/stream] Wrote final data: ${finalDataString.trim()}`);
            break;
          }
        }
        console.log(`[POST /chat/stream] Follow-up stream completed successfully, processed ${followUpChunkCount} chunks`);
      } catch (followUpError) {
        console.error(`[POST /chat/stream] Error in follow-up stream:`, followUpError);
        console.error(`[POST /chat/stream] Follow-up error details:`, {
          message: followUpError.message,
          stack: followUpError.stack,
          code: followUpError.code,
          status: followUpError.status
        });
        
        // If follow-up streaming fails, fall back to non-streaming for the follow-up
        console.log(`[POST /chat/stream] Attempting fallback to non-streaming`);
        try {
          const followUpResult = await req.app.get('ai').models.generateContent(followUpRequest);
          console.log(`[POST /chat/stream] Follow-up fallback result:`, JSON.stringify(followUpResult, null, 2));
          
          if (followUpResult.candidates[0].content?.parts) {
            console.log(`[POST /chat/stream] Processing ${followUpResult.candidates[0].content.parts.length} fallback parts`);
            for (const part of followUpResult.candidates[0].content.parts) {
              let eventData = {};
              if (part.text) {
                eventData.text = part.text;
                console.log(`[POST /chat/stream] Sending fallback text: ${part.text}`);
              }
              if (part.thought) { 
                eventData.thought = true;
              }
              if (Object.keys(eventData).length > 0) {
                const dataString = `data: ${JSON.stringify(eventData)}\n\n`;
                res.write(dataString);
                console.log(`[POST /chat/stream] Wrote fallback data: ${dataString.trim()}`);
              }
            }
          }
          
          // Send final data
          const finalData = {
            finishReason: followUpResult.candidates[0].finishReason,
            usageMetadata: followUpResult.usageMetadata,
            safetyRatings: followUpResult.candidates[0].safetyRatings
          };
          const finalDataString = `event: done\ndata: ${JSON.stringify(finalData)}\n\n`;
          res.write(finalDataString);
          console.log(`[POST /chat/stream] Wrote fallback final data: ${finalDataString.trim()}`);
        } catch (fallbackError) {
          console.error(`[POST /chat/stream] Fallback also failed:`, fallbackError);
          const errorDataString = `event: error\ndata: ${JSON.stringify({ error: { message: 'Function call completed but response generation failed' } })}\n\n`;
          res.write(errorDataString);
        }
        } // end else block for non-image tools
      } // end if functionCallsToExecute.length > 0
    }
  } catch (e) {
    console.error('[STREAM ERROR]', e);
    const errorMessage = (e instanceof Error) ? e.message : 'Stream error occurred.';
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

// Function result handling endpoint
router.post('/function-result', async (req, res) => {
  try {
    const { modelId, originalContents, functionResponse, config } = req.body;
    if (!originalContents || !functionResponse) return res.status(400).json({ error: 'Invalid input.' });
    const newContents = [...originalContents, { role: 'function', parts: [{ functionResponse: { name: functionResponse.name, response: functionResponse.response }}]}];
    const apiRequest = { model: modelId || 'gemini-2.0-flash', contents: newContents, config: {} };
    if (config) apiRequest.config = config;
    const result = await req.app.get('ai').models.generateContent(apiRequest);
    const c = result.candidates[0];
    let resp = c.text;
    if (apiRequest.config.responseMimeType === 'application/json') {
      try { resp = JSON.parse(c.text); } catch {}
    }
    res.json({ response: resp, usageMetadata: result.usageMetadata, finishReason: c.finishReason });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;