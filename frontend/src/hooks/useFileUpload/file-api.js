/**
 * File upload API functions
 */

import { BACKEND_URL } from './constants';

/**
 * Upload a file to the server
 * 
 * @param {File} fileToUpload - File object to upload
 * @returns {Promise<Object>} - File metadata on success
 */
export const uploadFileToServer = async (fileToUpload) => {
  console.log("useFileUpload: Uploading file:", fileToUpload.name);
  try {
    const formData = new FormData();
    formData.append('file', fileToUpload);

    const response = await fetch(`${BACKEND_URL}/files`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error?.message || data.error || `HTTP error! status: ${response.status}`);
    }

    console.log("useFileUpload: File uploaded successfully:", data.file);
    return data.file; // Return file info on success
  } catch (err) {
    console.error('File upload error in hook:', err);
    // Re-throw the error so the component calling this can handle it
    throw err;
  }
};

/**
 * Remove a file from the server
 * 
 * @param {string} fileIdToRemove - File ID to remove (googleFileName)
 * @returns {Promise<boolean>} - Success indicator
 */
export const removeFileFromServer = async (fileIdToRemove) => {
  console.log("useFileUpload: Attempting to remove file:", fileIdToRemove);
  try {
    const response = await fetch(`${BACKEND_URL}/files/${encodeURIComponent(fileIdToRemove)}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error?.message || data.error || `HTTP error! status: ${response.status}`);
    }
    
    console.log("useFileUpload: File removed successfully from server:", fileIdToRemove);
    return true; // Indicate success
  } catch (err) {
    console.error('File removal error in hook:', err);
    // Re-throw the error so the component calling this can handle it
    throw err;
  }
};

/**
 * List all files from the server
 * 
 * @param {boolean} sync - Whether to sync with Google Files API
 * @returns {Promise<Array>} - Array of file metadata
 */
export const listFilesFromServer = async (sync = false) => {
  console.log("useFileUpload: Listing files from server, sync:", sync);
  try {
    const url = sync ? `${BACKEND_URL}/files?sync=true` : `${BACKEND_URL}/files`;
    const response = await fetch(url);

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error?.message || data.error || `HTTP error! status: ${response.status}`);
    }
    
    console.log("useFileUpload: Files listed successfully:", data.files.length);
    return data.files || [];
  } catch (err) {
    console.error('File listing error in hook:', err);
    throw err;
  }
};

/**
 * Get file metadata from the server
 * 
 * @param {string} fileId - File ID to get metadata for
 * @returns {Promise<Object>} - File metadata
 */
export const getFileMetadata = async (fileId) => {
  console.log("useFileUpload: Getting file metadata for:", fileId);
  try {
    const response = await fetch(`${BACKEND_URL}/files/${encodeURIComponent(fileId)}/info`);

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error?.message || data.error || `HTTP error! status: ${response.status}`);
    }
    
    console.log("useFileUpload: File metadata retrieved successfully:", data.file);
    return data.file;
  } catch (err) {
    console.error('File metadata error in hook:', err);
    throw err;
  }
};

/**
 * Remove multiple files from the server
 * 
 * @param {Array<string>} fileIds - Array of file IDs to remove
 * @returns {Promise<Object>} - Results of batch deletion
 */
export const batchRemoveFilesFromServer = async (fileIds) => {
  console.log("useFileUpload: Batch removing files:", fileIds);
  const results = {
    success: [],
    failed: []
  };

  for (const fileId of fileIds) {
    try {
      await removeFileFromServer(fileId);
      results.success.push(fileId);
    } catch (error) {
      results.failed.push({ fileId, error: error.message });
    }
  }

  console.log("useFileUpload: Batch removal results:", results);
  return results;
};