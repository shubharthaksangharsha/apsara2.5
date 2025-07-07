import express from 'express';
import http from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { WebSocketServer } from 'ws';

// Import configuration
import { PORT, GEMINI_API_KEY } from './config/env.js';
import connectDB from './config/database.js';

// Import middleware
import { configureCors } from './middleware/cors.js';
import { authMiddleware } from './middleware/auth.js';

// Import AI services
import { initializeAI } from './services/ai.js';
import CacheService from './services/cache.js';

// Import route handlers
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import systemRoutes from './routes/system.js';
import fileRoutes from './routes/files.js';
import chatRoutes from './routes/chat.js';
import toolsRoutes from './routes/tools.js';
import cacheRoutes from './routes/cache.js';

// Import WebSocket handler
import { setupWebSocketServer } from './websocket/liveHandler.js';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Express & HTTP server setup
const app = express();
const server = http.createServer(app);

// Serve static files
app.use(express.static(join(__dirname, 'public')));

// Configure CORS
app.use(configureCors());

// Body parser (allow large base64 images)
app.use(express.json({ limit: '50mb' }));

// Cookie parser for auth
app.use(cookieParser());

// Initialize Gemini AI client
const ai = initializeAI(GEMINI_API_KEY);

// Initialize cache service
const cacheService = new CacheService(GEMINI_API_KEY);

// Store AI client and cache service in app for use in routes
app.set('ai', ai);
app.set('cacheService', cacheService);

// Apply auth middleware to all requests
app.use(authMiddleware);

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Legacy API routes (without /api prefix)
// Route models requests to the apiRoutes handler
app.get('/models', (req, res, next) => {
  req.url = '/models'; // Keep URL the same
  apiRoutes(req, res, next); // Forward to apiRoutes
});

app.get('/models/live', (req, res, next) => {
  req.url = '/models/live'; // Keep URL the same
  apiRoutes(req, res, next); // Forward to apiRoutes
});

// System routes
app.use('/system', systemRoutes);

// Voice routes
app.get('/voices', (req, res, next) => {
  req.url = '/voices'; // Keep URL the same
  systemRoutes(req, res, next); // Forward to systemRoutes
});

app.post('/voices/select', (req, res, next) => {
  req.url = '/voices/select';
  systemRoutes(req, res, next); // Forward to systemRoutes
});

// Files routes
app.use('/files', fileRoutes);

// Cache routes
app.use('/cache', cacheRoutes);

// Tools routes
app.use('/tools', toolsRoutes);

// Chat routes
app.use('/chat', chatRoutes);

// Setup WebSocket server for live connections
setupWebSocketServer(server, ai);

// Connect to database
connectDB();

// Start server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log('REST: /health, /models, /voices, /voices/select, /system, /tools, /tools/invoke, /files, /cache, /chat, /chat/stream, /chat/function-result');
  console.log('WS: ws://<host>/live[ /text /audio /video ]');
});

export default app;
