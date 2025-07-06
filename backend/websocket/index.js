// websocket/index.js - Main export file for WebSocket functionality

import { setupWebSocketServer } from './server.js';
import { handleLiveConnection } from './handlers/connectionHandler.js';

export { setupWebSocketServer, handleLiveConnection };
