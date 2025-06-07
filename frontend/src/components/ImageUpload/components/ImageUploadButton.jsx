import React, { useRef, useEffect, useCallback } from 'react';
import { ImagePlus } from 'lucide-react';
import { DEFAULT_ACCEPT, PASTE_EVENT_TYPE, UPLOAD_BUTTON_ARIA_LABEL } from '../constants';

/**
 * Button component for uploading images with clipboard paste support
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onFilesSelected - Callback when files are selected
 * @param {boolean} props.multiple - Whether multiple files can be selected
 * @param {string} props.accept - MIME types to accept
 * @returns {JSX.Element} Image upload button component
 */
export default function ImageUploadButton({ 
  onFilesSelected, 
  multiple = true, 
  accept = DEFAULT_ACCEPT 
}) {
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const processFiles = useCallback((incomingFiles) => {
    if (incomingFiles && incomingFiles.length > 0) {
      const imageFiles = Array.from(incomingFiles)
        .filter(file => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        onFilesSelected(imageFiles);
      }
    }
  }, [onFilesSelected]);

  const handleFileChange = (event) => {
    processFiles(event.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = useCallback((event) => {
    const items = (event.clipboardData || event.originalEvent?.clipboardData)?.items;
    if (items) {
      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          files.push(items[i].getAsFile());
        }
      }
      if (files.length > 0) {
        processFiles(files);
        event.preventDefault(); // Prevent pasting image into text input if focused
      }
    }
  }, [processFiles]);

  useEffect(() => {
    document.addEventListener(PASTE_EVENT_TYPE, handlePaste);
    return () => {
      document.removeEventListener(PASTE_EVENT_TYPE, handlePaste);
    };
  }, [handlePaste]);

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        multiple={multiple}
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={handleButtonClick}
        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
        aria-label={UPLOAD_BUTTON_ARIA_LABEL}
      >
        <ImagePlus size={20} />
      </button>
    </>
  );
} 