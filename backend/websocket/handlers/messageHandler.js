// websocket/handlers/messageHandler.js - Process WebSocket messages
import { WebSocket } from 'ws';
import { sessions } from '../server.js';
import { handleToolCalls } from './toolHandler.js';

// Process messages from the AI service
export function setupMessageHandlers(ws, session, req) {
  // Define message handler for incoming messages from the client
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

  // Setup close handler
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

  // Setup error handler
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
}

// Configure AI message callbacks
export function setupAiMessageCallbacks(ws, session, req) {
  return {
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

      // Check if client WebSocket is still connected before trying to send messages
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        // Only log at most once per second to avoid flooding the console
        const now = Date.now();
        if (!session._lastConnectionWarningTime || (now - session._lastConnectionWarningTime) > 1000) {
          console.warn(`[Live Backend] Cannot forward Google message [${messageType}] <${sessionIdShort}> to client WS (not open). State: ${ws ? ws.readyState : 'ws is null'}`);
          session._lastConnectionWarningTime = now;
        }
        return; // Skip sending to avoid the error logs
      }

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
        // Double-check the WebSocket state again for extra safety
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(evt));
        }
      } catch (sendError) {
        console.error(`[Live Backend] Error forwarding Google message [${messageType}] <${sessionIdShort}> to client WebSocket:`, sendError);
      }

      // Handle tool calls if present
      if (ws && ws.readyState === WebSocket.OPEN) {
        await handleToolCalls(evt, ws, session, req);
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
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: 'error', message: e.message || 'Unknown Google live session error' }));
        }
      } catch (wsErr) {
        console.error(`[Live Backend] Error sending Google error event <${sessionIdShort}> to client:`, wsErr);
      }
      try { if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) ws.close(1011, "Google session error"); } catch (closeErr) {}
    },
    onclose: (closeEvent) => {
      const sessionIdShort = session?.conn?.id?.substring(0, 8) ?? 'N/A'; // Safer logging
      const code = closeEvent?.code || 'N/A';
      const reason = closeEvent?.reason || 'N/A';
      console.log(`--- [Live Backend] Google Session <${sessionIdShort}> CLOSED --- Code: ${code}, Reason: ${reason}`);
      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: 'closed', code: code, reason: reason }));
        } else {
          console.warn(`[Live Backend] Google 'onclose' <${sessionIdShort}> fired, but client WS already closed. State: ${ws ? ws.readyState : 'ws is null'}`);
        }
      } catch (wsErr) {
        console.error(`[Live Backend] Error sending 'closed' event <${sessionIdShort}> to client:`, wsErr);
      }
      try { if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) ws.close(1000, "Google session closed"); } catch(e){}
      sessions.delete(ws);
    }
  };
}
