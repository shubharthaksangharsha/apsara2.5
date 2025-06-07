import React from 'react';
import { Paperclip, X, FileText, Image as ImageIcon, Film, Type } from 'lucide-react';
import {
  PREVIEW_ITEM_CONTAINER,
  ICON_CONTAINER,
  FILE_NAME,
  FILE_SIZE,
  REMOVE_BUTTON
} from './constants';

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
    <div className={PREVIEW_ITEM_CONTAINER}>
      <div className={ICON_CONTAINER}>
        {getFileIcon(file.mimetype)}
        <span className={FILE_NAME} title={file.originalname}>
          {file.originalname || 'Unnamed File'}
        </span>
        {file.size && (
          <span className={FILE_SIZE}>
            ({(file.size / 1024).toFixed(1)} KB)
          </span>
        )}
      </div>
      <button
        onClick={() => onRemove(fileId)}
        className={REMOVE_BUTTON}
        title="Remove file"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
} 