import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import { Modality } from '@google/genai';
import { getModelToolCapabilities, availableVoices } from '../config/ai.js';
import { getToolDeclarations, toolHandlers } from '../services/tools/index.js';
import { buildLiveConnectionConfig } from '../services/ai.js';
import { getDefaultSystemInstruction } from '../config/ai.js';

// In‐memory WebSocket sessions
const sessions = new Map();

// Initialize WebSocket server
export function setupWebSocketServer(server, ai) {
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
          } catch(e) { 
            console.error("[HTTP Upgrade] Error sending backend_connected ack:", e); 
          }

          // Wrap handleLiveConnection in a promise chain to catch errors
          Promise.resolve() // Start promise chain
            .then(() => handleLiveConnection(wsClient, req, ai)) // Execute async handler
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
}

async function handleLiveConnection(ws, req, ai) {
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
      if (cookieMap['apsara_auth']) {
        try {
          userTokens = JSON.parse(cookieMap['apsara_auth']);
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
        }
      } else {
        console.log("[Live Backend] No system instruction provided.");
      }

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
        
      // Enhanced native audio feature detection with better logging
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
    const liveConnectConfig = buildLiveConnectionConfig({
      requestedModel,
      requestedModality,
      requestedVoice,
      requestedSystemInstruction,
      isAuthenticated,
      userTokens,
      slidingWindowEnabled,
      slidingWindowTokens,
      transcriptionEnabled,
      mediaResolution,
      requestedResumeHandle,
      requestedRealtimeConfig,
      getDefaultSystemInstruction
    });

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

            // Log if url_context_metadata is present at the candidate level
            if (evt.candidates && evt.candidates[0] && evt.candidates[0].url_context_metadata) {
              console.log(`[Live Backend] DETECTED URL_CONTEXT_METADATA (candidates) <${sessionIdShort}>:`, JSON.stringify(evt.candidates[0].url_context_metadata));
            }
            // Log if url_context_metadata is present within serverContent (less likely but good to check)
            if (evt.serverContent && evt.serverContent.url_context_metadata) {
              console.log(`[Live Backend] DETECTED URL_CONTEXT_METADATA (serverContent) <${sessionIdShort}>:`, JSON.stringify(evt.serverContent.url_context_metadata));
            }
            // Log if urlContextMetadata is present directly in the event (as per Gemini docs for non-streaming/unary?)
            if (evt.urlContextMetadata) { // This is how it appears in the Gemini Node.js SDK for generateContent, might differ for live
              console.log(`[Live Backend] DETECTED URL_CONTEXT_METADATA (direct evt) <${sessionIdShort}>:`, JSON.stringify(evt.urlContextMetadata));
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
      } catch(e) { console.error("[Live Backend] Error handling SDK connection error:", e); }
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
    }

    const sessionId = session.conn?.id?.substring(0, 8) ?? 'N/A';
    console.log(`[Live Backend] Client WS <${sessionId}> connected, associated with Google session. Setting up message handlers.`);
    sessions.set(ws, session);

    // --- Client WebSocket Message Handler ---
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
            if (parsedMessage.chunk.data && parsedMessage.chunk.mimeType) {
              await currentSession.sendRealtimeInput({
                video: {
                  data: parsedMessage.chunk.data,
                  mimeType: parsedMessage.chunk.mimeType
                }
              });
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
            } else {
              console.warn(`[Live Backend] Received screen_chunk JSON but chunk data/mimeType missing <${currentSessionId}>.`);
            }
          } else {
            // Unknown JSON structure
            console.warn(`[Live Backend] Received Buffer containing unrecognized JSON structure <${currentSessionId}>:`, parsedMessage);
          }
        } else {
          // --- Handle Raw Binary Data (Assume Audio PCM) ---
          const base64Pcm = message.toString('base64');
          await currentSession.sendRealtimeInput({
            audio: { data: base64Pcm, mimeType: 'audio/pcm' } // Assuming PCM if not JSON
          });
        }
      } catch (error) {
        console.error(`[Live Backend] Error processing client message or sending to Google <${currentSessionId}>:`, error);
      }
    });

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
}

export { handleLiveConnection };
