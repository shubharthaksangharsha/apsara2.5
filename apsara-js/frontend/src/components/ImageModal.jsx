import React from 'react';
import { X, Download, Share2 } from 'lucide-react';

export default function ImageModal({ isOpen, onClose, imageData }) {
  if (!isOpen || !imageData) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `data:${imageData.mimeType};base64,${imageData.data}`;
    link.download = `image.${imageData.mimeType.split('/')[1] || 'png'}`; // e.g., image.png
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    const imageFile = await (await fetch(`data:${imageData.mimeType};base64,${imageData.data}`)).blob();
    const filesArray = [
        new File([imageFile], `image.${imageData.mimeType.split('/')[1] || 'png'}`, {
            type: imageData.mimeType,
        }),
    ];

    if (navigator.share && navigator.canShare && navigator.canShare({ files: filesArray })) {
      try {
        await navigator.share({
          files: filesArray,
          title: 'Shared Image',
          text: 'Check out this image!',
        });
        console.log('Image shared successfully');
      } catch (error) {
        console.error('Error sharing image:', error);
        // Fallback or error message
        alert('Sharing failed. Your browser might not support sharing files directly, or an error occurred.');
      }
    } else {
      // Fallback for browsers that don't support Web Share API or sharing files
      console.warn('Web Share API not supported or cannot share files.');
      alert('Sharing is not supported on your browser, or file sharing is disabled. You can download the image instead.');
      // You could implement a copy link to image data URI as a fallback.
    }
  };

  // Doodle functionality is complex and would require a canvas library.
  // For now, it's out of scope for this immediate update.

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
            src={`data:${imageData.mimeType};base64,${imageData.data}`}
            alt="Full view"
            className="max-w-full max-h-full object-contain"
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
          {navigator.share && navigator.canShare && ( // Only show share if API is available
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
         {/* Placeholder for Doodle - could be another button that reveals a canvas */}
         {/* <p className="text-xs text-center text-gray-500 mt-2">Doodle feature coming soon!</p> */}
      </div>
    </div>
  );
} 