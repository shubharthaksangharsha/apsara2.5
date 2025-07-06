import React, { useState, useEffect } from 'react';
import { Database, Clock, Trash2, Plus, RefreshCw } from 'lucide-react';
import cacheService from '../../services/cacheService';

/**
 * Cache Management Component
 * Shows active caches and allows basic management
 */
export default function CacheManager({ isOpen, onClose }) {
  const [caches, setCaches] = useState([]);
  const [activeCaches, setActiveCaches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load caches when component opens
  useEffect(() => {
    if (isOpen) {
      loadCaches();
    }
  }, [isOpen]);

  const loadCaches = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await cacheService.listCaches();
      setCaches(result.caches || []);
      setActiveCaches(result.activeCaches || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCache = async (cacheName) => {
    try {
      await cacheService.deleteCache(cacheName);
      await loadCaches(); // Refresh list
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateTTL = async (cacheName, newTTL) => {
    try {
      await cacheService.updateCacheTTL(cacheName, newTTL);
      await loadCaches(); // Refresh list
    } catch (err) {
      setError(err.message);
    }
  };

  const formatExpireTime = (expireTime) => {
    const date = new Date(expireTime);
    const now = new Date();
    const diffMinutes = Math.floor((date - now) / (1000 * 60));
    
    if (diffMinutes < 0) return 'Expired';
    if (diffMinutes < 60) return `${diffMinutes}m remaining`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h remaining`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d remaining`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Cache Management
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadCaches}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">Loading caches...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Caches */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Active Caches ({activeCaches.length})
                </h3>
                {activeCaches.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No active caches</p>
                ) : (
                  <div className="space-y-3">
                    {activeCaches.map((cache) => (
                      <div
                        key={cache.name}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {cache.displayName || cache.name}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Model: {cache.model}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Tokens: {cache.tokenCount?.toLocaleString() || 'Unknown'}
                            </p>
                            {cache.files && cache.files.length > 0 && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Files: {cache.files.map(f => f.name).join(', ')}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {formatExpireTime(cache.expireTime)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateTTL(cache.name, 2)}
                              className="text-sm px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              title="Extend by 2 hours"
                            >
                              +2h
                            </button>
                            <button
                              onClick={() => handleDeleteCache(cache.name)}
                              className="p-2 text-red-500 hover:text-red-700 rounded"
                              title="Delete cache"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* All Caches */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  All Caches ({caches.length})
                </h3>
                {caches.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No caches found</p>
                ) : (
                  <div className="space-y-2">
                    {caches.map((cache) => (
                      <div
                        key={cache.name}
                        className="p-3 border border-gray-200 dark:border-gray-700 rounded flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-white">
                            {cache.displayName || cache.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {cache.model} • {cache.tokenCount?.toLocaleString() || 'Unknown'} tokens
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatExpireTime(cache.expireTime)}
                          </span>
                          <button
                            onClick={() => handleDeleteCache(cache.name)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Context caching helps reduce costs by reusing frequently accessed content like system instructions and large files.
            Caches are automatically created when beneficial and expire after their TTL period.
          </p>
        </div>
      </div>
    </div>
  );
}
