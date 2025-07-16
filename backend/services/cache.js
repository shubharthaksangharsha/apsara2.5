// services/cache.js
import { GoogleGenAI } from '@google/genai';

/**
 * Cache service for managing Gemini API context caching
 * Helps reduce costs by caching frequently used content like system instructions and large files
 */
class CacheService {
  constructor(apiKey) {
    this.ai = new GoogleGenAI({ apiKey });
    this.activeCaches = new Map(); // Track active caches in memory
  }

  /**
   * Create a cache for system instruction and files
   * @param {string} modelName - Model to use for caching
   * @param {string} systemInstruction - System instruction to cache
   * @param {Array} files - Array of files to include in cache
   * @param {number} ttlHours - Time to live in hours (default 1 hour)
   * @returns {Promise<Object>} Cache object
   */
  async createCache(modelName, systemInstruction, files = [], ttlHours = 1) {
    try {
      // Ensure model name is in correct format for caching
      const cacheModelName = modelName.startsWith('models/') ? modelName : `models/${modelName}`;
      
      // Use supported models for caching (without models/ prefix for SDK)
      const supportedModels = [
        'gemini-2.0-flash',
        'gemini-2.5-flash-preview-05-20',

        'gemini-2.5-flash-preview-04-17',
      ];
      
      // Remove models/ prefix if present for SDK usage
      const baseModelName = modelName.replace('models/', '');
      const finalModelName = supportedModels.includes(baseModelName) ? baseModelName : 'gemini-1.5-flash-001';
      
      console.log(`[CacheService] Using model for caching: ${finalModelName}`);
      
      const contents = [];
      
      // Add files to contents if provided
      if (files && files.length > 0) {
        files.forEach(file => {
          if (file.uri) {
            contents.push({
              role: 'user',
              parts: [{
                fileData: {
                  mimeType: file.mimetype || file.mimeType,
                  fileUri: file.uri
                }
              }]
            });
          }
        });
      }

      const cacheConfig = {
        model: finalModelName,
        config: {
          ttl: `${ttlHours * 3600}s`, // Convert hours to seconds
          displayName: `Cache_${Date.now()}`,
        }
      };

      // Add contents if we have files
      if (contents.length > 0) {
        cacheConfig.config.contents = contents;
      }

      // Add system instruction if provided
      if (systemInstruction && systemInstruction.trim()) {
        cacheConfig.config.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      console.log('[CacheService] Creating cache with config:', JSON.stringify(cacheConfig, null, 2));
      
      const cache = await this.ai.caches.create(cacheConfig);
      
      // Store in memory for tracking
      this.activeCaches.set(cache.name, {
        ...cache,
        createdAt: Date.now(),
        files: files.map(f => ({ id: f.id || f.googleFileName, name: f.originalname }))
      });

      console.log(`[CacheService] Cache created: ${cache.name}, expires: ${cache.expireTime}`);
      return cache;
    } catch (error) {
      console.error('[CacheService] Error creating cache:', error);
      throw error;
    }
  }

  /**
   * Create a cache from chat history
   * @param {string} modelName - Model to use for caching
   * @param {Array} chatHistory - Chat history to cache
   * @param {string} systemInstruction - System instruction
   * @param {number} ttlHours - Time to live in hours
   * @returns {Promise<Object>} Cache object
   */
  async createCacheFromHistory(modelName, chatHistory, systemInstruction, ttlHours = 2) {
    try {
      // Remove models/ prefix if present for SDK usage
      const baseModelName = modelName.replace('models/', '');
      const supportedModels = [
        'gemini-1.5-flash-001',
        'gemini-1.5-pro-001', 
        'gemini-2.0-flash-001'
      ];
      const finalModelName = supportedModels.includes(baseModelName) ? baseModelName : 'gemini-1.5-flash-001';
      
      const cacheConfig = {
        model: finalModelName,
        config: {
          contents: chatHistory,
          ttl: `${ttlHours * 3600}s`,
          displayName: `ChatCache_${Date.now()}`,
        }
      };

      if (systemInstruction && systemInstruction.trim()) {
        cacheConfig.config.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const cache = await this.ai.caches.create(cacheConfig);
      
      this.activeCaches.set(cache.name, {
        ...cache,
        createdAt: Date.now(),
        type: 'chat_history'
      });

      console.log(`[CacheService] Chat history cache created: ${cache.name}`);
      return cache;
    } catch (error) {
      console.error('[CacheService] Error creating chat history cache:', error);
      throw error;
    }
  }

  /**
   * Get cache by name
   * @param {string} cacheName - Name of the cache
   * @returns {Promise<Object>} Cache object
   */
  async getCache(cacheName) {
    try {
      const cache = await this.ai.caches.get({ name: cacheName });
      return cache;
    } catch (error) {
      console.error(`[CacheService] Error getting cache ${cacheName}:`, error);
      throw error;
    }
  }

  /**
   * List all active caches
   * @returns {Promise<Array>} Array of cache objects
   */
  async listCaches() {
    try {
      const caches = [];
      const pager = await this.ai.caches.list({ config: { pageSize: 50 } });
      let page = pager.page;
      
      while (true) {
        for (const cache of page) {
          caches.push(cache);
        }
        if (!pager.hasNextPage()) break;
        page = await pager.nextPage();
      }
      
      return caches;
    } catch (error) {
      console.error('[CacheService] Error listing caches:', error);
      throw error;
    }
  }

  /**
   * Update cache TTL
   * @param {string} cacheName - Name of the cache
   * @param {number} ttlHours - New TTL in hours
   * @returns {Promise<Object>} Updated cache object
   */
  async updateCacheTTL(cacheName, ttlHours) {
    try {
      const updatedCache = await this.ai.caches.update({
        name: cacheName,
        config: { ttl: `${ttlHours * 3600}s` }
      });
      
      console.log(`[CacheService] Updated cache ${cacheName} TTL to ${ttlHours} hours`);
      return updatedCache;
    } catch (error) {
      console.error(`[CacheService] Error updating cache ${cacheName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a cache
   * @param {string} cacheName - Name of the cache to delete
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteCache(cacheName) {
    try {
      await this.ai.caches.delete({ name: cacheName });
      this.activeCaches.delete(cacheName);
      console.log(`[CacheService] Deleted cache: ${cacheName}`);
      return true;
    } catch (error) {
      console.error(`[CacheService] Error deleting cache ${cacheName}:`, error);
      throw error;
    }
  }

  /**
   * Clean up expired caches (local tracking only)
   */
  cleanupExpiredCaches() {
    const now = Date.now();
    for (const [cacheName, cache] of this.activeCaches) {
      const expireTime = new Date(cache.expireTime).getTime();
      if (now > expireTime) {
        this.activeCaches.delete(cacheName);
        console.log(`[CacheService] Cleaned up expired cache: ${cacheName}`);
      }
    }
  }

  /**
   * Get active caches summary
   * @returns {Array} Array of cache summaries
   */
  getActiveCachesSummary() {
    this.cleanupExpiredCaches();
    return Array.from(this.activeCaches.values()).map(cache => ({
      name: cache.name,
      displayName: cache.displayName,
      model: cache.model,
      createdAt: cache.createdAt,
      expireTime: cache.expireTime,
      tokenCount: cache.usageMetadata?.totalTokenCount || 0,
      files: cache.files || [],
      type: cache.type || 'content'
    }));
  }

  /**
   * Find suitable cache for given content
   * @param {string} systemInstruction - System instruction to match
   * @param {Array} files - Files to match
   * @returns {Object|null} Matching cache or null
   */
  findSuitableCache(systemInstruction, files = []) {
    this.cleanupExpiredCaches();
    
    for (const cache of this.activeCaches.values()) {
      // Simple matching logic - can be enhanced
      if (cache.files && files.length > 0) {
        const cacheFileIds = cache.files.map(f => f.id);
        const requestFileIds = files.map(f => f.id || f.googleFileName);
        
        // Check if all request files are in cache
        const allFilesMatched = requestFileIds.every(id => cacheFileIds.includes(id));
        if (allFilesMatched) {
          return cache;
        }
      }
    }
    
    return null;
  }
}

export default CacheService;
