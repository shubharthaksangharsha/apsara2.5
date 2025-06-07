import React from 'react';
import FilePreviewItem from './FilePreviewItem';
import { PREVIEW_BAR_CONTAINER, PREVIEW_LIST_CONTAINER } from './constants';

export default function FilePreviewBar({ files, onRemoveFile }) {
  if (!files || files.length === 0) {
    return null;
  }

  return (
    <div className={PREVIEW_BAR_CONTAINER}>
      <div className={PREVIEW_LIST_CONTAINER}>
        {files.map((file) => (
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