import express from 'express';
import CacheService from '../services/cache.js';
import { GEMINI_API_KEY } from '../config/env.js';

const router = express.Router();

// Initialize cache service
const cacheService = new CacheService(GEMINI_API_KEY);

/**
 * Create a new cache
 * POST /cache
 * Body: { model, systemInstruction, files, ttlHours }
 */
router.post('/', async (req, res) => {
  try {
    const { model = 'models/gemini-2.0-flash', systemInstruction, files = [], ttlHours = 1 } = req.body;
    
    if (!systemInstruction && (!files || files.length === 0)) {
      return res.status(400).json({ 
        error: 'Either systemInstruction or files must be provided' 
      });
    }

    const cache = await cacheService.createCache(model, systemInstruction, files, ttlHours);
    
    res.json({ 
      success: true, 
      cache: {
        name: cache.name,
        displayName: cache.displayName,
        model: cache.model,
        expireTime: cache.expireTime,
        tokenCount: cache.usageMetadata?.totalTokenCount || 0
      }
    });
  } catch (error) {
    console.error('[Cache Route] Error creating cache:', error);
    res.status(500).json({ 
      error: 'Failed to create cache', 
      details: error.message 
    });
  }
});

/**
 * Create cache from chat history
 * POST /cache/from-history
 * Body: { model, chatHistory, systemInstruction, ttlHours }
 */
router.post('/from-history', async (req, res) => {
  try {
    const { model = 'models/gemini-2.0-flash', chatHistory, systemInstruction, ttlHours = 2 } = req.body;
    
    if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
      return res.status(400).json({ 
        error: 'chatHistory must be a non-empty array' 
      });
    }

    const cache = await cacheService.createCacheFromHistory(model, chatHistory, systemInstruction, ttlHours);
    
    res.json({ 
      success: true, 
      cache: {
        name: cache.name,
        displayName: cache.displayName,
        model: cache.model,
        expireTime: cache.expireTime,
        tokenCount: cache.usageMetadata?.totalTokenCount || 0
      }
    });
  } catch (error) {
    console.error('[Cache Route] Error creating cache from history:', error);
    res.status(500).json({ 
      error: 'Failed to create cache from history', 
      details: error.message 
    });
  }
});

/**
 * Get cache by name
 * GET /cache/:name
 */
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const cache = await cacheService.getCache(name);
    
    res.json({ 
      success: true, 
      cache: {
        name: cache.name,
        displayName: cache.displayName,
        model: cache.model,
        expireTime: cache.expireTime,
        tokenCount: cache.usageMetadata?.totalTokenCount || 0
      }
    });
  } catch (error) {
    console.error('[Cache Route] Error getting cache:', error);
    res.status(500).json({ 
      error: 'Failed to get cache', 
      details: error.message 
    });
  }
});

/**
 * List all caches
 * GET /cache
 */
router.get('/', async (req, res) => {
  try {
    const caches = await cacheService.listCaches();
    const activeCaches = cacheService.getActiveCachesSummary();
    
    res.json({ 
      success: true, 
      caches: caches.map(cache => ({
        name: cache.name,
        displayName: cache.displayName,
        model: cache.model,
        expireTime: cache.expireTime,
        tokenCount: cache.usageMetadata?.totalTokenCount || 0
      })),
      activeCaches 
    });
  } catch (error) {
    console.error('[Cache Route] Error listing caches:', error);
    res.status(500).json({ 
      error: 'Failed to list caches', 
      details: error.message 
    });
  }
});

/**
 * Update cache TTL
 * PUT /cache/:name/ttl
 * Body: { ttlHours }
 */
router.put('/:name/ttl', async (req, res) => {
  try {
    const { name } = req.params;
    const { ttlHours } = req.body;
    
    if (!ttlHours || ttlHours <= 0) {
      return res.status(400).json({ 
        error: 'ttlHours must be a positive number' 
      });
    }

    const updatedCache = await cacheService.updateCacheTTL(name, ttlHours);
    
    res.json({ 
      success: true, 
      cache: {
        name: updatedCache.name,
        displayName: updatedCache.displayName,
        model: updatedCache.model,
        expireTime: updatedCache.expireTime,
        tokenCount: updatedCache.usageMetadata?.totalTokenCount || 0
      }
    });
  } catch (error) {
    console.error('[Cache Route] Error updating cache TTL:', error);
    res.status(500).json({ 
      error: 'Failed to update cache TTL', 
      details: error.message 
    });
  }
});

/**
 * Delete cache
 * DELETE /cache/:name
 */
router.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const success = await cacheService.deleteCache(name);
    
    res.json({ 
      success, 
      message: success ? 'Cache deleted successfully' : 'Failed to delete cache' 
    });
  } catch (error) {
    console.error('[Cache Route] Error deleting cache:', error);
    res.status(500).json({ 
      error: 'Failed to delete cache', 
      details: error.message 
    });
  }
});

/**
 * Find suitable cache for given content
 * POST /cache/find-suitable
 * Body: { systemInstruction, files }
 */
router.post('/find-suitable', async (req, res) => {
  try {
    const { systemInstruction, files = [] } = req.body;
    
    const suitableCache = cacheService.findSuitableCache(systemInstruction, files);
    
    if (suitableCache) {
      res.json({ 
        success: true, 
        cache: {
          name: suitableCache.name,
          displayName: suitableCache.displayName,
          model: suitableCache.model,
          expireTime: suitableCache.expireTime,
          tokenCount: suitableCache.usageMetadata?.totalTokenCount || 0
        }
      });
    } else {
      res.json({ 
        success: true, 
        cache: null,
        message: 'No suitable cache found'
      });
    }
  } catch (error) {
    console.error('[Cache Route] Error finding suitable cache:', error);
    res.status(500).json({ 
      error: 'Failed to find suitable cache', 
      details: error.message 
    });
  }
});

/**
 * Force cache creation for testing
 * POST /cache/force-create
 * Body: { model, systemInstruction, files, ttlHours, chatHistory }
 */
router.post('/force-create', async (req, res) => {
  try {
    const { 
      model = 'models/gemini-2.0-flash', 
      systemInstruction = 'You are a helpful assistant.',
      files = [], 
      ttlHours = 1,
      chatHistory = []
    } = req.body;
    
    let cache;
    
    if (chatHistory && chatHistory.length > 0) {
      // Create cache from chat history
      cache = await cacheService.createCacheFromHistory(model, chatHistory, systemInstruction, ttlHours);
    } else {
      // Create cache from system instruction and files
      cache = await cacheService.createCache(model, systemInstruction, files, ttlHours);
    }
    
    res.json({ 
      success: true, 
      cache: {
        name: cache.name,
        displayName: cache.displayName,
        model: cache.model,
        expireTime: cache.expireTime,
        tokenCount: cache.usageMetadata?.totalTokenCount || 0
      },
      message: 'Cache created successfully'
    });
  } catch (error) {
    console.error('[Cache Route] Error force creating cache:', error);
    res.status(500).json({ 
      error: 'Failed to create cache', 
      details: error.message 
    });
  }
});

export default router;
