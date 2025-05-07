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
  const removeFile = async (fileIdToRemove) => { // fileIdToRemove is the googleFileName
     console.log("useFileUpload: Attempting to remove file:", fileIdToRemove);
     try {
       const response = await fetch(`${BACKEND_URL}/files/${encodeURIComponent(fileIdToRemove)}`, {
         method: 'DELETE',
       });

       const data = await response.json();
       if (!response.ok || data.error) {
            throw new Error(data.error?.message || data.error || `HTTP error! status: ${response.status}`);
       }
       
       // Update local state by filtering out the removed file
       setFiles(prevFiles => prevFiles.filter(f => f.googleFileName !== fileIdToRemove && f.id !== fileIdToRemove));
       console.log("useFileUpload: File removed successfully from frontend state:", fileIdToRemove);
       return true; // Indicate success
     } catch (err) {
       console.error('File removal error in hook:', err);
       // Re-throw or handle as needed, e.g., show an alert to the user
       throw err;
     }
  };

  return {
    files,
    setFiles, // Expose setter if direct manipulation is needed
    uploadFile,
    removeFile, // Expose remove function
  };
}