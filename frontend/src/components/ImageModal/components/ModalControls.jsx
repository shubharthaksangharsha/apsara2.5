import React from 'react';
import { X, Download, Share2 } from 'lucide-react';
import { BACKEND_URL } from '../constants';

/**
 * Component for the control buttons in the image modal
 * 
 * @param {Object} props - Component props
 * @param {Object} props.imageData - Data for the image
 * @param {Function} props.onClose - Function to close the modal
 * @returns {JSX.Element} Modal controls component
 */
export default function ModalControls({ imageData, onClose }) {
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
  );
} 