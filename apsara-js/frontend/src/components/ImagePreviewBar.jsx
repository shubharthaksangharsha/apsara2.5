import React from 'react';
import ImagePreviewItem from './ImagePreviewItem';

export default function ImagePreviewBar({ files, onRemoveFile, uploadStatus }) { // Added uploadStatus
  if (!files || files.length === 0) {
    return null;
  }

  return (
    // Adjusted styling for better visual separation and consistency
    <div className="px-1 sm:px-2 py-2 mb-2 border-y border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-750 rounded-lg shadow-sm">
      <div className="flex overflow-x-auto custom-scrollbar pb-1 space-x-2 items-center">
        {files.map((file, index) => (
          <ImagePreviewItem 
            key={file.name + '-' + index} // Ensure key is more unique if names can repeat
            file={file} 
            onRemove={() => onRemoveFile(file)} // Pass the full file object
            status={uploadStatus ? uploadStatus[file.name] : 'pending'} // Pass individual status
          />
        ))}
      </div>
    </div>
  );
}