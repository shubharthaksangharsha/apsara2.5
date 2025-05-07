import React from 'react';
import { Paperclip, X, FileText, Image as ImageIcon, Film, Type } from 'lucide-react'; // Added more icons

const getFileIcon = (mimeType = "") => {
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
  if (mimeType.startsWith('application/pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType.startsWith('video/')) return <Film className="h-5 w-5 text-purple-500" />;
  if (mimeType.startsWith('text/')) return <Type className="h-5 w-5 text-green-500" />;
  return <Paperclip className="h-5 w-5 text-gray-500" />;
};

export default function FilePreviewItem({ file, onRemove }) {
  if (!file) return null;

  // Use googleFileName if available (it's the unique ID from Google), fallback to id or originalname
  const fileId = file.googleFileName || file.id || file.originalname;

  return (
    <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-xs">
      <div className="flex items-center gap-2 overflow-hidden">
        {getFileIcon(file.mimetype)}
        <span className="truncate" title={file.originalname}>
          {file.originalname || 'Unnamed File'}
        </span>
        {file.size && (
          <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">
            ({(file.size / 1024).toFixed(1)} KB)
          </span>
        )}
      </div>
      <button
        onClick={() => onRemove(fileId)}
        className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
        title="Remove file"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
} 