import { useState, useEffect } from 'react';

const BACKEND_URL = 'http://localhost:9000'; // Consider moving to config

export function useFileUpload(initialFiles = []) {
  const [files, setFiles] = useState(initialFiles);

  // Update state if initial prop changes (e.g., fetched async)
   useEffect(() => {
     setFiles(initialFiles);
   }, [initialFiles]);


  const uploadFile = async (fileToUpload) => {
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

      // Add the successfully uploaded file metadata to the state
      setFiles(prev => [...prev, data.file]);
      console.log("useFileUpload: File uploaded successfully:", data.file);
      return data.file; // Return file info on success
    } catch (err) {
      console.error('File upload error in hook:', err);
      // Re-throw the error so the component calling this can handle it (e.g., show alert)
      throw err;
    }
  };

  // Optional: Add a function to remove/delete files if needed
  const deleteFile = async (fileId) => {
     // TODO: Implement backend call to delete file
     console.log("Attempting to delete file (not implemented):", fileId);
     // setFiles(prev => prev.filter(f => f.id !== fileId)); // Optimistic UI update
  }

  return {
    files,
    setFiles, // Expose setter if direct manipulation is needed
    uploadFile,
    // deleteFile, // Expose delete function if implemented
  };
}