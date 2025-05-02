import React, { useState, useRef } from 'react';
import { FileUp, X } from 'lucide-react'; // Import X icon

export default function FileUploadPopup({ onClose, onUpload, files = [] }) { // Default files to empty array
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null); // State for upload errors

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploading) return; // Prevent drag while uploading
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
      setError(null); // Clear error on new drag
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (uploading) return; 
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };
  
  const handleChange = async (e) => {
    e.preventDefault();
    if (uploading) return; 

    if (e.target.files && e.target.files[0]) {
      await handleFileUpload(e.target.files[0]);
    }
  };
  
  const handleFileUpload = async (file) => {
    setUploading(true);
    setError(null); // Clear previous errors
    try {
      await onUpload(file); // Call the upload function passed from App.jsx
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(`Upload failed: ${err.message || 'Unknown error'}`); // Set error state
    } finally {
      setUploading(false);
      // Clear the input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4" 
      onClick={handleOverlayClick}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-gray-800 dark:text-gray-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Attach Files
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close file upload"
          >
            <X className="h-5 w-5" /> {/* Use X icon */}
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Drop Zone */}
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
              dragActive 
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current.click()} // Trigger click only if not uploading
          >
            <FileUp className="h-10 w-10 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Max file size handled by backend. Accepts various formats.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleChange}
              disabled={uploading}
              aria-hidden="true" 
            />
            {/* Button is primarily for visual cue, main click is on the dropzone div */}
            <button
              type="button" // Prevent form submission if wrapped in a form later
              disabled={uploading}
              onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }} // Prevent div click, trigger input
              className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Select File'}
            </button>
          </div>

          {/* Upload Error Display */}
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-md">
              {error}
            </div>
          )}
          
          {/* File List */}
          {files && files.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Uploaded Files</h3>
              <ul className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50 dark:bg-gray-700/50 custom-scrollbar">
                {files.map((file, idx) => (
                  <li 
                    // Use a more stable key if available, e.g., file.id or file.name + file.size
                    key={file.id || `${file.originalname}-${idx}`} 
                    className="text-xs flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded shadow-sm"
                  >
                    <span className="flex-shrink-0 mr-2">
                       {file.mimetype?.startsWith('image') ? '🖼️' : '📄'}
                    </span>
                    <span className="truncate flex-1 mr-2" title={file.originalname}>
                      {file.originalname}
                    </span>
                    {/* Optional: Add file size or delete button here later */}
                    {/* <span className="text-gray-500 dark:text-gray-400 text-[10px] mr-2">{(file.size / 1024).toFixed(1)} KB</span> */}
                    {/* <button onClick={() => onDeleteFile(file.id)} className="text-red-500 hover:text-red-700"> <Trash2 size={12}/> </button> */}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Footer Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}