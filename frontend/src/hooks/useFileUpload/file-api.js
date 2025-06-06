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