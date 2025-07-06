import { useState, useEffect } from 'react';
import { uploadFileToServer, removeFileFromServer } from './file-api';

/**
 * Hook for managing file uploads
 * 
 * @param {Array} initialFiles - Initial array of file objects
 * @returns {Object} - File state and management functions
 */
export function useFileUpload(initialFiles = []) {
  const [files, setFiles] = useState(initialFiles);

  // Update state if initial prop changes (e.g., fetched async)
  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  /**
   * Upload a file to the server
   * 
   * @param {File} fileToUpload - File object to upload
   * @returns {Promise<Object>} - File metadata on success
   */
  const uploadFile = async (fileToUpload) => {
    const fileInfo = await uploadFileToServer(fileToUpload);
    
    // Add the successfully uploaded file metadata to the state
    setFiles(prev => [...prev, fileInfo]);
    
    return fileInfo;
  };

  /**
   * Remove a file from the server and state
   * 
   * @param {string} fileIdToRemove - File ID to remove (googleFileName)
   * @returns {Promise<boolean>} - Success indicator
   */
  const removeFile = async (fileIdToRemove) => {
    await removeFileFromServer(fileIdToRemove);
    
    // Update local state by filtering out the removed file
    setFiles(prevFiles => prevFiles.filter(
      f => f.googleFileName !== fileIdToRemove && f.id !== fileIdToRemove
    ));
    
    return true;
  };

  return {
    files,
    setFiles, // Expose setter if direct manipulation is needed
    uploadFile,
    removeFile,
  };
} 