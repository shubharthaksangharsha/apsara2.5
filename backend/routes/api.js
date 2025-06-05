// routes/api.js
import express from 'express';
import { chatModels } from '../config/ai.js';
import { fetchLiveModels, DEFAULT_LIVE_MODELS } from '../services/ai.js';

const router = express.Router();

// Health endpoint
router.get('/health', (req, res) => res.json({status: 'ok'}));

// Chat models endpoint
router.get('/models', (req, res) => {
  try {
    res.json(chatModels);
  } catch (error) {
    console.error('[GET /api/models] Error:', error);
    res.status(500).json({ error: 'Failed to fetch chat models' });
  }
});

// Live models endpoint
router.get('/models/live', async (req, res) => {
  try {
    const models = await fetchLiveModels(DEFAULT_LIVE_MODELS);
    res.json(models);
  } catch (error) {
    console.error('[GET /api/models/live] Error:', error);
    res.status(500).json({ error: 'Failed to fetch live models' });
  }
});

export default router;