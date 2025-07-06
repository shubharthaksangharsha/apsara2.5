import React, { useState, useRef } from 'react';
import { FileUp, X } from 'lucide-react';
import {
  POPUP_OVERLAY,
  POPUP_CONTAINER,
  POPUP_HEADER,
  POPUP_TITLE,
  CLOSE_BUTTON,
  DROP_ZONE_BASE,
  DROP_ZONE_ACTIVE,
  DROP_ZONE_INACTIVE,
  DROP_ZONE_DISABLED,
  UPLOAD_BUTTON,
  ERROR_MESSAGE,
  FILE_LIST_CONTAINER,
  FILE_LIST_ITEM,
  DONE_BUTTON
} from './constants';

export default function FileUploadPopup({ onClose, onUpload, files = [] }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploading) return;
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
      setError(null);
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
    setError(null);
    try {
      await onUpload(file);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(`Upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  const dropZoneClasses = `${DROP_ZONE_BASE} ${
    dragActive ? DROP_ZONE_ACTIVE : DROP_ZONE_INACTIVE
  } ${uploading ? DROP_ZONE_DISABLED : ''}`;
  
  return (
    <div className={POPUP_OVERLAY} onClick={handleOverlayClick}>
      <div className={POPUP_CONTAINER} onClick={e => e.stopPropagation()}>
        <div className={POPUP_HEADER}>
          <h2 className={POPUP_TITLE}>
            <FileUp className="h-5 w-5" />
            Attach Files
          </h2>
          <button 
            onClick={onClose}
            className={CLOSE_BUTTON}
            aria-label="Close file upload"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Drop Zone */}
          <div 
            className={dropZoneClasses}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current.click()}
          >
            <FileUp className="h-10 w-10 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Supports images, PDFs, documents, text files, audio, and video files.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Max file size: 2GB per file via Google Files API.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleChange}
              disabled={uploading}
              accept="image/*,application/pdf,text/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,audio/*,video/*"
              aria-hidden="true" 
            />
            <button
              type="button"
              disabled={uploading}
              onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
              className={UPLOAD_BUTTON}
            >
              {uploading ? 'Uploading...' : 'Select File'}
            </button>
          </div>

          {/* Upload Error Display */}
          {error && (
            <div className={ERROR_MESSAGE}>
              {error}
            </div>
          )}
          
          {/* File List */}
          {files && files.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Uploaded Files</h3>
              <ul className={FILE_LIST_CONTAINER}>
                {files.map((file, idx) => (
                  <li 
                    key={file.id || `${file.originalname}-${idx}`} 
                    className={FILE_LIST_ITEM}
                  >
                    <span className="flex-shrink-0 mr-2">
                       {file.mimetype?.startsWith('image') ? '🖼️' : '📄'}
                    </span>
                    <span className="truncate flex-1 mr-2" title={file.originalname}>
                      {file.originalname}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Footer Button */}
        <div className="mt-8 flex justify-end">
          <button onClick={onClose} className={DONE_BUTTON}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}