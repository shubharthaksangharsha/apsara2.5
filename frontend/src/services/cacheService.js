// frontend/src/services/cacheService.js
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:9000';

class CacheService {
  /**
   * Create a new cache
   * @param {string} model - Model name
   * @param {string} systemInstruction - System instruction
   * @param {Array} files - Array of file objects
   * @param {number} ttlHours - Time to live in hours
   * @returns {Promise<Object>} Cache object
   */
  async createCache(model, systemInstruction, files = [], ttlHours = 1) {
    const response = await fetch(`${BACKEND_URL}/cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({
        model,
        systemInstruction,
        files,
        ttlHours
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create cache: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Create cache from chat history
   * @param {string} model - Model name
   * @param {Array} chatHistory - Chat history
   * @param {string} systemInstruction - System instruction
   * @param {number} ttlHours - Time to live in hours
   * @returns {Promise<Object>} Cache object
   */
  async createCacheFromHistory(model, chatHistory, systemInstruction, ttlHours = 2) {
    const response = await fetch(`${BACKEND_URL}/cache/from-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({
        model,
        chatHistory,
        systemInstruction,
        ttlHours
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create cache from history: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * List all caches
   * @returns {Promise<Object>} Caches list
   */
  async listCaches() {
    const response = await fetch(`${BACKEND_URL}/cache`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list caches: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get cache by name
   * @param {string} name - Cache name
   * @returns {Promise<Object>} Cache object
   */
  async getCache(name) {
    const response = await fetch(`${BACKEND_URL}/cache/${name}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get cache: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Update cache TTL
   * @param {string} name - Cache name
   * @param {number} ttlHours - New TTL in hours
   * @returns {Promise<Object>} Updated cache object
   */
  async updateCacheTTL(name, ttlHours) {
    const response = await fetch(`${BACKEND_URL}/cache/${name}/ttl`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({ ttlHours })
    });

    if (!response.ok) {
      throw new Error(`Failed to update cache TTL: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Delete cache
   * @param {string} name - Cache name
   * @returns {Promise<Object>} Success response
   */
  async deleteCache(name) {
    const response = await fetch(`${BACKEND_URL}/cache/${name}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete cache: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Find suitable cache for given content
   * @param {string} systemInstruction - System instruction
   * @param {Array} files - Files array
   * @returns {Promise<Object>} Suitable cache or null
   */
  async findSuitableCache(systemInstruction, files = []) {
    const response = await fetch(`${BACKEND_URL}/cache/find-suitable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({
        systemInstruction,
        files
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to find suitable cache: ${response.statusText}`);
    }

    return await response.json();
  }
}

export default new CacheService();
