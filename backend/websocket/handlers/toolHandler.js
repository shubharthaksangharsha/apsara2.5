// websocket/handlers/toolHandler.js - Handle AI tool calls
import { WebSocket } from 'ws';
import { toolHandlers } from '../../services/tools/index.js';

// Handle tool calls from the AI and send responses
export async function handleToolCalls(evt, ws, session, req) {
  if (!evt.toolCall?.functionCalls?.length > 0) return;

  const sessionIdShort = session?.conn?.id?.substring(0, 8) ?? 'N/A';
  console.log(`[Live Backend] Received toolCall request from Google <${sessionIdShort}>:`, JSON.stringify(evt.toolCall.functionCalls));
  
  // Notify frontend that tool call is happening
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ event: 'tool_call_started', calls: evt.toolCall.functionCalls }));
    } catch (e) {
      console.error(`[Live Backend] Error sending tool_call_started to client:`, e);
    }
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
        if (result?._mapDisplayData && ws && ws.readyState === WebSocket.OPEN) {
          try {
            console.log(`[Live Backend] Sending map_display_update event for tool ${call.name} with data:`, JSON.stringify(result._mapDisplayData));
            ws.send(JSON.stringify({
              event: 'map_display_update',
              mapData: result._mapDisplayData // Send only the map-specific data
            }));
          } catch (e) {
            console.error(`[Live Backend] Error sending map_display_update:`, e);
          }
        }
                         
        // --- Check for Image Generation Data and send separate event ---
        if ((call.name === 'generateImage' || call.name === 'editImage') && 
          result?.imageData && ws && ws.readyState === WebSocket.OPEN) {
          try {
            console.log(`[Live Backend] Sending ${call.name === 'generateImage' ? 'imageGenerated' : 'imageEdited'} event with data`);
            ws.send(JSON.stringify({
              event: call.name === 'generateImage' ? 'imageGenerated' : 'imageEdited',
              imageData: result.imageData,
              mimeType: result.mimeType || 'image/png',
              description: result.description || ''
            }));
          } catch (e) {
            console.error(`[Live Backend] Error sending image event:`, e);
          }
        }

        // Notify frontend of custom tool result (send the non-map part)
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            // Clone result and remove map data before sending to frontend as standard tool result
            const resultForFrontend = { ...result };
            delete resultForFrontend._mapDisplayData;
            ws.send(JSON.stringify({ event: 'tool_call_result', name: call.name, result: resultForFrontend }));
          } catch (e) {
            console.error(`[Live Backend] Error sending tool_call_result:`, e);
          }
        }
      } catch (toolError) {
        console.error(`[Live Backend] Error executing custom tool ${call.name} <${sessionIdShort}>:`, toolError);
        responsesToSend.push({ id: call.id, name: call.name, response: { error: toolError.message || 'Execution failed' } });
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ event: 'tool_call_error', name: call.name, error: toolError.message || 'Execution failed' }));
          } catch (e) {
            console.error(`[Live Backend] Error sending tool_call_error:`, e);
          }
        }
      }
    }
  }
  
  if (responsesToSend.length > 0) {
    try {
      console.log(`[Live Backend] Sending toolResponse back to Google <${sessionIdShort}>.`);
      await session.sendToolResponse({ functionResponses: responsesToSend });
    } catch (e) {
      console.error(`[Live Backend] Error sending tool response to Google:`, e);
    }
  }
}
