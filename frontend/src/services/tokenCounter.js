/**
 * Token counting service using Gemini API
 * 
 * According to Gemini API documentation:
 * - Images: 258 tokens per tile (768x768 pixels)
 * - Video: 263 tokens per second
 * - Audio: 32 tokens per second
 * - Documents: Variable based on content
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:9000';

// Cache for token counts - persist in localStorage
const TOKEN_CACHE_KEY = 'apsara_token_counts';
const getTokenCache = () => {
  try {
    const cached = localStorage.getItem(TOKEN_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (error) {
    console.warn('Failed to load token cache:', error);
    return {};
  }
};

const setTokenCache = (cache) => {
  try {
    localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Failed to save token cache:', error);
  }
};

/**
 * Count tokens for a file using the Gemini API
 * 
 * @param {Object} file - File object with metadata
 * @returns {Promise<number>} - Token count
 */
export async function countTokensForFile(file) {
  if (!file) return 0;

  const fileId = file.googleFileName || file.id || file.originalname;
  const fileSize = file.size || file.sizeBytes || 0; // Handle missing size
  const cacheKey = `${fileId}_${fileSize}_${file.mimetype}`;
  
  // Check if file already has a cached token count
  if (file.tokenCount && file.tokenCount > 0) {
    return file.tokenCount;
  }

  // Check localStorage cache first
  const tokenCache = getTokenCache();
  if (tokenCache[cacheKey]) {
    // Always update the file object with the cached value
    if (file) {
      file.tokenCount = tokenCache[cacheKey];
    }
    return tokenCache[cacheKey];
  }

  try {
    const response = await fetch(`${BACKEND_URL}/files/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId: file.googleFileName || file.id,
        mimeType: file.mimetype,
        size: fileSize
      }),
    });

    if (!response.ok) {
      console.warn('Failed to get token count from API, using estimation');
      const estimated = getEstimatedTokenCount(file);
      // Cache the estimated count
      tokenCache[cacheKey] = estimated;
      setTokenCache(tokenCache);
      if (file) file.tokenCount = estimated;
      return estimated;
    }

    const data = await response.json();
    const tokenCount = data.tokenCount || getEstimatedTokenCount(file);
    
    // Cache the token count in localStorage and the file object
    tokenCache[cacheKey] = tokenCount;
    setTokenCache(tokenCache);
    if (file) {
      file.tokenCount = tokenCount;
    }
    
    return tokenCount;
  } catch (error) {
    console.warn('Error counting tokens:', error);
    const estimated = getEstimatedTokenCount(file);
    // Cache the estimated count
    const tokenCache = getTokenCache();
    tokenCache[cacheKey] = estimated;
    setTokenCache(tokenCache);
    if (file) file.tokenCount = estimated;
    return estimated;
  }
}

/**
 * Fallback token estimation based on file type and size
 * 
 * @param {Object} file - File object
 * @returns {number} - Estimated token count
 */
function getEstimatedTokenCount(file) {
  if (!file || !file.size) return 0;

  const mimeType = file.mimetype || '';
  const sizeKB = file.size / 1024;

  // For PDF files, Gemini documentation states: "Each document page is equivalent to 258 tokens"
  // Rough estimate: 1KB ≈ 6 tokens for PDF content
  if (mimeType === 'application/pdf') {
    return Math.round(sizeKB * 6);
  }

  // For images, use fixed 258 tokens (minimum for small images)
  if (mimeType.startsWith('image/')) {
    return 258; // Base token count for images
  }

  // For text files, rough estimate: 1KB ≈ 200 tokens
  if (mimeType.startsWith('text/')) {
    return Math.round(sizeKB * 200);
  }

  // For video files: 263 tokens per second (estimate based on duration)
  if (mimeType.startsWith('video/')) {
    // Since we don't have duration, estimate based on file size
    // Average video: 1MB per minute ≈ 60 seconds ≈ 15,780 tokens
    const estimatedMinutes = sizeKB / 1024; // MB
    return Math.round(estimatedMinutes * 60 * 263);
  }

  // For audio files: 32 tokens per second
  if (mimeType.startsWith('audio/')) {
    // Average audio: 1MB per minute ≈ 60 seconds ≈ 1,920 tokens
    const estimatedMinutes = sizeKB / 1024; // MB
    return Math.round(estimatedMinutes * 60 * 32);
  }

  // Default estimate for other file types
  return Math.round(sizeKB * 4);
}

/**
 * Initialize token counts from cache for files
 * 
 * @param {Array} files - Array of file objects
 * @returns {Array} - Files with token counts from cache
 */
export function initializeTokenCountsFromCache(files) {
  if (!files || files.length === 0) return files;

  const tokenCache = getTokenCache();
  
  return files.map(file => {
    const fileId = file.googleFileName || file.id || file.originalname;
    const fileSize = file.size || file.sizeBytes || 0; // Handle missing size
    const cacheKey = `${fileId}_${fileSize}_${file.mimetype}`;
    
    // If file doesn't have token count but cache does, use cached value
    if ((!file.tokenCount || file.tokenCount === 0) && tokenCache[cacheKey]) {
      return {
        ...file,
        tokenCount: tokenCache[cacheKey]
      };
    }
    
    return file;
  });
}

/**
 * Batch count tokens for multiple files
 * 
 * @param {Array} files - Array of file objects
 * @returns {Promise<Array>} - Array of files with token counts
 */
export async function countTokensForFiles(files) {
  if (!files || files.length === 0) return [];

  const promises = files.map(async (file) => ({
    ...file,
    tokenCount: await countTokensForFile(file)
  }));

  return Promise.all(promises);
}
