// routes/chat.js
import express from 'express';
import { buildApiRequest } from '../utils/apiHelpers.js';

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
    const result = await req.app.get('ai').models.generateContent(apiRequest);
    console.log(`[POST /chat] Response from Google API:`, JSON.stringify(result, null, 2));
    const c = result.candidates[0];
    if (['SAFETY', 'RECITATION'].includes(c.finishReason)) return res.status(400).json({});
    
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
    const stream = await req.app.get('ai').models.generateContentStream(apiRequest);

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
            console.log('[STREAMING TO CLIENT]', dataString);
            res.write(dataString);
          }
        }
      }

      if (chunk.functionCalls) {
        const fcDataString = `event: function_call\ndata: ${JSON.stringify({ functionCalls: chunk.functionCalls })}\n\n`;
        console.log('[STREAMING FUNCTION CALL TO CLIENT]', fcDataString);
        res.write(fcDataString);
      }

      if (candidate.groundingMetadata) {
        const gmDataString = `event: grounding\ndata: ${JSON.stringify(candidate.groundingMetadata)}\n\n`;
        console.log('[STREAMING GROUNDING METADATA TO CLIENT]', gmDataString);
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
    console.error('[STREAM ERROR]', e);
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