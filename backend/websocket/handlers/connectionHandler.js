// websocket/handlers/connectionHandler.js - Main connection handler
import { WebSocket } from 'ws';
import { parseConnectionParams } from '../config/paramParser.js';
import { setupMessageHandlers, setupAiMessageCallbacks } from './messageHandler.js';
import { sessions } from '../server.js';
import { buildLiveConnectionConfig } from '../../services/ai.js';
import { getDefaultSystemInstruction } from '../../config/ai.js';

// Process auth cookies for WebSocket connection
function processAuthCookies(req) {
  const result = {
    isAuthenticated: false,
    userTokens: null
  };
  
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
        result.userTokens = JSON.parse(cookieMap['apsara_auth']);
        result.isAuthenticated = true;
        console.log(`[Live Backend] Successfully extracted auth tokens from cookie for WebSocket connection`);
      } catch (e) {
        console.error(`[Live Backend] Error parsing auth cookie: ${e.message}`);
      }
    }
  }
  
  return result;
}

// Main WebSocket connection handler
export async function handleLiveConnection(ws, req, ai) {
  console.log("[Live Backend] handleLiveConnection started.");
   
  // Process auth cookies
  const { isAuthenticated, userTokens } = processAuthCookies(req);
  
  // Attach tokens to request for tool handlers
  req.userTokens = userTokens;
  req.isAuthenticated = isAuthenticated;

  try {
    // Parse connection parameters from URL
    const config = parseConnectionParams(req);
   
    console.log(`[Live Backend] Effective Modality: ${config.requestedModality}, Voice: ${config.requestedVoice || 'N/A'}, System Instruction: ${!!config.requestedSystemInstruction}`);

    // --- Prepare Config based on Request ---
    const liveConnectConfig = buildLiveConnectionConfig({
      ...config,
      isAuthenticated,
      userTokens,
      getDefaultSystemInstruction
    });

    // Add debug log for liveConnectConfig
    console.log('[Live Backend] Final liveConnectConfig for ai.live.connect:', JSON.stringify(liveConnectConfig, null, 2));

    let session;
    try {
      console.log('[Live Backend] Calling ai.live.connect with model:', config.requestedModel);
      
      // Setup AI callback handlers
      const callbacks = setupAiMessageCallbacks(ws, null, req); // We'll update this with session later
      
      session = await ai.live.connect({
        model: config.requestedModel,
        config: liveConnectConfig,
        callbacks
      });
      
      // Update callbacks reference with actual session
      callbacks.session = session;
      
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

    // Setup WebSocket message handlers for this connection
    setupMessageHandlers(ws, session, req);

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
