// websocket/server.js - WebSocket server initialization
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import { handleLiveConnection } from './handlers/connectionHandler.js';

// In‐memory WebSocket sessions
export const sessions = new Map();

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
