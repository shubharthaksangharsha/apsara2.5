import { useState, useCallback } from 'react';
import { uploadFileToServer, removeFileFromServer, listFilesFromServer, getFileMetadata, batchRemoveFilesFromServer } from './file-api';
import { initializeTokenCountsFromCache } from '../../services/tokenCounter';

/**
 * Hook for managing file uploads
 * 
 * @param {Array} initialFiles - Initial array of file objects
 * @returns {Object} - File state and management functions
 */
export function useFileUpload(initialFiles = []) {
  // Initialize with token counts from cache
  const [files, setFiles] = useState(() => initializeTokenCountsFromCache(initialFiles));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Upload a file to the server
   * 
   * @param {File} fileToUpload - File object to upload
   * @returns {Promise<Object>} - File metadata on success
   */
  const uploadFile = useCallback(async (fileToUpload) => {
    setIsLoading(true);
    setError(null);
    try {
      const fileInfo = await uploadFileToServer(fileToUpload);
      
      // Add the successfully uploaded file metadata to the state
      setFiles(prev => [...prev, fileInfo]);
      
      return fileInfo;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Remove a file from the server and state
   * 
   * @param {string} fileIdToRemove - File ID to remove (googleFileName)
   * @returns {Promise<boolean>} - Success indicator
   */
  const removeFile = useCallback(async (fileIdToRemove) => {
    setIsLoading(true);
    setError(null);
    try {
      await removeFileFromServer(fileIdToRemove);
      
      // Update local state by filtering out the removed file
      setFiles(prevFiles => prevFiles.filter(
        f => f.googleFileName !== fileIdToRemove && f.id !== fileIdToRemove
      ));
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * List all files from the server
   * 
   * @param {boolean} sync - Whether to sync with Google Files API
   * @returns {Promise<Array>} - Array of file metadata
   */
  const listFiles = useCallback(async (sync = false) => {
    console.log('useFileUpload: listFiles called with sync:', sync);
    setIsLoading(true);
    setError(null);
    try {
      const fileList = await listFilesFromServer(sync);
      console.log('useFileUpload: Got file list:', fileList.length, 'files');
      
      // Initialize token counts from cache
      const filesWithTokenCounts = initializeTokenCountsFromCache(fileList);
      setFiles(filesWithTokenCounts);
      return filesWithTokenCounts;
    } catch (err) {
      console.error('useFileUpload: Error listing files:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get file metadata
   * 
   * @param {string} fileId - File ID to get metadata for
   * @returns {Promise<Object>} - File metadata
   */
  const getFileInfo = useCallback(async (fileId) => {
    setIsLoading(true);
    setError(null);
    try {
      const metadata = await getFileMetadata(fileId);
      return metadata;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Remove multiple files from the server and state
   * 
   * @param {Array<string>} fileIds - Array of file IDs to remove
   * @returns {Promise<Object>} - Results of batch deletion
   */
  const batchRemoveFiles = useCallback(async (fileIds) => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await batchRemoveFilesFromServer(fileIds);
      
      // Update local state by filtering out the successfully removed files
      setFiles(prevFiles => prevFiles.filter(
        f => !results.success.includes(f.googleFileName) && !results.success.includes(f.id)
      ));
      
      if (results.failed.length > 0) {
        const failedFileNames = results.failed.map(f => f.fileId).join(', ');
        setError(`Failed to remove some files: ${failedFileNames}`);
      }
      
      return results;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Search files by name or type
   * 
   * @param {string} query - Search query
   * @param {string} type - File type filter (optional)
   * @returns {Array} - Filtered files
   */
  const searchFiles = useCallback((query, type = null) => {
    return files.filter(file => {
      const matchesQuery = !query || 
        file.originalname?.toLowerCase().includes(query.toLowerCase()) ||
        file.displayName?.toLowerCase().includes(query.toLowerCase());
      
      const matchesType = !type || file.mimetype?.startsWith(type);
      
      return matchesQuery && matchesType;
    });
  }, [files]);

  /**
   * Get files by type
   * 
   * @param {string} type - File type prefix (e.g., 'image/', 'application/pdf')
   * @returns {Array} - Files matching the type
   */
  const getFilesByType = useCallback((type) => {
    return files.filter(file => file.mimetype?.startsWith(type));
  }, [files]);

  /**
   * Get file statistics
   * 
   * @returns {Object} - File statistics
   */
  const getFileStats = useCallback(() => {
    const stats = {
      total: files.length,
      totalSize: files.reduce((sum, file) => sum + (file.size || 0), 0),
      types: {},
      expiring: []
    };

    files.forEach(file => {
      // Count by type
      const type = file.mimetype?.split('/')[0] || 'unknown';
      stats.types[type] = (stats.types[type] || 0) + 1;

      // Check expiration (Google Files API files expire after 48 hours)
      if (file.expirationTime) {
        const expirationDate = new Date(file.expirationTime);
        const now = new Date();
        const hoursLeft = (expirationDate - now) / (1000 * 60 * 60);
        
        if (hoursLeft < 24) { // Files expiring within 24 hours
          stats.expiring.push({
            ...file,
            hoursLeft: Math.max(0, hoursLeft)
          });
        }
      }
    });

    return stats;
  }, [files]);

  return {
    files,
    setFiles, // Expose setter if direct manipulation is needed
    isLoading,
    error,
    uploadFile,
    removeFile,
    listFiles,
    getFileInfo,
    batchRemoveFiles,
    searchFiles,
    getFilesByType,
    getFileStats,
  };
}