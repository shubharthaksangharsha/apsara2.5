import React, { useState, useEffect } from 'react';
import { X, Download, Share2 } from 'lucide-react';

// Backend URL for fetching file content
const BACKEND_URL = 'http://localhost:9000';

export default function ImageModal({ isOpen, onClose, imageData }) {
  if (!isOpen || !imageData) return null;

  // Check if we have a URI or a base64 data
  const isFileUri = imageData.uri && !imageData.data;
  
  // Determine the image source to display
  const getImageSrc = () => {
    if (imageData.data) {
      // Direct base64 data
      return `data:${imageData.mimeType};base64,${imageData.data}`;
    } else if (imageData.uri) {
      // For Google API URIs, send just the file ID to the backend
      if (imageData.uri.includes('generativelanguage.googleapis.com')) {
        // Extract just the file ID from the end of the Google API URI
        const fileId = imageData.uri.split('/').pop();
        return `${BACKEND_URL}/files/content?fileId=${fileId}`;
      } else {
        // For other URIs, use the regular endpoint (though this may need adjustment)
        return `${BACKEND_URL}/files/content?uri=${encodeURIComponent(imageData.uri)}`;
      }
    }
    return '';
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    if (imageData.data) {
      // For base64 data
      link.href = `data:${imageData.mimeType};base64,${imageData.data}`;
    } else if (imageData.uri) {
      // Use the same URL format as in getImageSrc
      if (imageData.uri.includes('generativelanguage.googleapis.com')) {
        const fileId = imageData.uri.split('/').pop();
        link.href = `${BACKEND_URL}/files/content?fileId=${fileId}`;
      } else {
        link.href = `${BACKEND_URL}/files/content?uri=${encodeURIComponent(imageData.uri)}`;
      }
    }
    
    // Get extension from mimeType or default to png
    const extension = (imageData.mimeType || 'image/png').split('/')[1] || 'png';
    link.download = `image.${extension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!navigator.share) {
      alert('Web Share API is not supported in your browser. Please try downloading.');
      return;
    }

    try {
      // Get the image as a blob
      let blob;
      if (imageData.data) {
        // For base64 data
        const response = await fetch(`data:${imageData.mimeType};base64,${imageData.data}`);
        blob = await response.blob();
      } else if (imageData.uri) {
        // Use the same URL pattern as in getImageSrc
        let url;
        if (imageData.uri.includes('generativelanguage.googleapis.com')) {
          const fileId = imageData.uri.split('/').pop();
          url = `${BACKEND_URL}/files/content?fileId=${fileId}`;
        } else {
          url = `${BACKEND_URL}/files/content?uri=${encodeURIComponent(imageData.uri)}`;
        }
        const response = await fetch(url);
        blob = await response.blob();
      } else {
        throw new Error('No valid image data to share');
      }
      
      // Create a file from the blob
      const extension = (imageData.mimeType || 'image/png').split('/')[1] || 'png';
      const file = new File([blob], `image.${extension}`, { type: imageData.mimeType || 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Shared Image',
          text: 'Check out this image from Apsara!',
        });
        console.log('Image shared successfully');
      } else {
        alert('Your browser supports sharing, but not directly sharing this file type. You can download the image instead.');
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      alert(`Sharing failed: ${error.message}. You can download the image instead.`);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-[100] p-4"
      onClick={onClose} // Close on overlay click
    >
      <div
        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-2xl max-w-4xl max-h-[90vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
      >
        {/* Image Display */}
        <div className="flex-grow overflow-auto flex justify-center items-center custom-scrollbar rounded mb-4">
          <img
            src={getImageSrc()}
            alt="Full view"
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              console.error('Error loading image:', e);
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0yNCAyNGgtMjR2LTI0aDI0djI0em0tMTEtN2gtM3YtOGgzdjh6bTUtNmgtM3Y2aDN2LTZ6bS0xMCAyaC0zdjRoM3YtNHoiLz48L3N2Zz4=';
            }}
          />
        </div>

        {/* Controls */}
        <div className="flex-shrink-0 flex justify-center items-center gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
            title="Download Image"
          >
            <Download size={18} /> Download
          </button>
          {navigator.share && ( // Show share button if basic Web Share API is present
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
              title="Share Image"
            >
              <Share2 size={18} /> Share
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
            title="Close"
          >
            <X size={18} /> Close
          </button>
        </div>
      </div>
    </div>
  );
}