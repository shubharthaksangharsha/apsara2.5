import React, { useRef, useEffect, useCallback } from 'react';
import { ImagePlus } from 'lucide-react';

export default function ImageUploadButton({ onFilesSelected, multiple = true, accept = "image/*" }) {
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
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  // Note: Drag and drop is better handled on a larger drop zone, 
  // typically the MessageInput or ChatWindow itself, rather than just this button.
  // We will add drag and drop to MessageInput.jsx

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
        aria-label="Upload images"
      >
        <ImagePlus size={20} />
      </button>
    </>
  );
}