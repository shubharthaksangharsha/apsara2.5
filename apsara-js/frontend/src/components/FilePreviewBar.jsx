import React from 'react';
import FilePreviewItem from './FilePreviewItem'; // Assuming it's in the same directory

export default function FilePreviewBar({ files, onRemoveFile }) {
  if (!files || files.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-b border-gray-200 dark:border-gray-700">
      <div className="flex flex-col gap-2 max-h-32 overflow-y-auto custom-scrollbar">
        {files.map((file) => (
          // Use googleFileName or id as key, fallback to originalname + index for safety if those are missing
          <FilePreviewItem
            key={file.googleFileName || file.id || `${file.originalname}-${files.indexOf(file)}`}
            file={file}
            onRemove={onRemoveFile}
          />
        ))}
      </div>
    </div>
  );
}