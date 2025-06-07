import React from 'react';
import ImageDisplay from './components/ImageDisplay';
import ModalControls from './components/ModalControls';

/**
 * Modal component for viewing, downloading, and sharing images
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Object} props.imageData - Data for the image to display
 * @returns {JSX.Element|null} Image modal component or null if not open
 */
export default function ImageModal({ isOpen, onClose, imageData }) {
  if (!isOpen || !imageData) return null;

  // Check if we have a URI or a base64 data
  const isFileUri = imageData.uri && !imageData.data;

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
        <ImageDisplay imageData={imageData} />

        {/* Controls */}
        <ModalControls imageData={imageData} onClose={onClose} />
      </div>
    </div>
  );
} 