import React from 'react';
import { BACKEND_URL, FALLBACK_IMAGE_SRC } from '../constants';

/**
 * Component to display an image in the modal
 * 
 * @param {Object} props - Component props
 * @param {Object} props.imageData - Data for the image to display
 * @returns {JSX.Element} Image display component
 */
export default function ImageDisplay({ imageData }) {
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
        // For other URIs, use the regular endpoint
        return `${BACKEND_URL}/files/content?uri=${encodeURIComponent(imageData.uri)}`;
      }
    }
    return '';
  };

  return (
    <div className="flex-grow overflow-auto flex justify-center items-center custom-scrollbar rounded mb-4">
      <img
        src={getImageSrc()}
        alt="Full view"
        className="max-w-full max-h-full object-contain"
        onError={(e) => {
          console.error('Error loading image:', e);
          e.target.src = FALLBACK_IMAGE_SRC;
        }}
      />
    </div>
  );
} 