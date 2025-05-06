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
    if (!navigator.share) {
      alert('Web Share API is not supported in your browser. Please try downloading.');
      return;
    }

    try {
      const response = await fetch(`data:${imageData.mimeType};base64,${imageData.data}`);
      const blob = await response.blob();
      const file = new File([blob], `image.${imageData.mimeType.split('/')[1] || 'png'}`, { type: imageData.mimeType });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Shared Image',
          text: 'Check out this image from Apsara!',
        });
        console.log('Image shared successfully');
      } else {
        // If canShare({files}) is false, try sharing title/text and hope the OS share sheet lets you add the image,
        // or inform the user. For simplicity, we'll alert for now.
        alert('Your browser supports sharing, but not directly sharing this file type or file. You can download the image.');
        // As a more advanced fallback, you could try sharing just a URL if you had one,
        // or copying the image to clipboard if browser supports Clipboard API for images.
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      alert(`Sharing failed: ${error.message}. You can download the image instead.`);
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
         {/* Placeholder for Doodle - could be another button that reveals a canvas */}
         {/* <p className="text-xs text-center text-gray-500 mt-2">Doodle feature coming soon!</p> */}
      </div>
    </div>
  );
} 