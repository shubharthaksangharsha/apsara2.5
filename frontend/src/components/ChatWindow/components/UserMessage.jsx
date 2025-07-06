import React, { useState } from 'react';
import { ClipboardCopy } from 'lucide-react';
import StreamingApsaraLogo from '../../StreamingApsaraLogo';
import { USER_MESSAGE_CLASSES, COPY_BUTTON_CLASSES, BACKEND_URL, IMAGE_CONTAINER_CLASSES, IMAGE_PREVIEW_CLASSES } from '../constants';
import FileAttachment from '../../FileAttachment';
import FileViewer from '../../FileViewer';

/**
 * User message component with image attachments and copy functionality
 * 
 * @param {Object} props - Component props
 * @param {Object} props.message - The user message data
 * @param {string} props.uniqueId - Unique identifier for this message
 * @param {boolean} props.isLastUser - Whether this is the last user message in the thread
 * @param {boolean} props.isThinking - Whether the AI is currently thinking
 * @param {string|null} props.streamingModelMessageId - ID of the message being streamed, if any
 * @param {string|null} props.copiedMsgId - ID of the currently copied message, if any
 * @param {Function} props.handleCopyMessage - Handler for copying message
 * @param {Function} props.handleImageClick - Handler for clicking on an image
 * @returns {JSX.Element} UserMessage component
 */
const UserMessage = ({ 
  message, 
  uniqueId, 
  isLastUser, 
  isThinking, 
  streamingModelMessageId, 
  copiedMsgId, 
  handleCopyMessage, 
  handleImageClick 
}) => {
  const [viewerFile, setViewerFile] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const hasImageAttachments = message.parts && message.parts.some(part => part.fileData && part.fileData.mimeType?.startsWith('image/'));
  
  // Extract non-image file attachments for FileAttachment component
  const nonImageFiles = message.parts ? message.parts
    .filter(part => part.fileData && !part.fileData.mimeType?.startsWith('image/'))
    .map((part, index) => ({
      id: part.fileData.fileUri?.split('/').pop() || `file-${message.id || uniqueId}-${index}`,
      originalname: part.fileData.fileName || 'Attached File',
      mimetype: part.fileData.mimeType,
      size: part.fileData.fileSize || 0,
      uri: part.fileData.fileUri,
      tokenCount: part.fileData.tokenCount || 0 // Use cached token count
    })) : [];

  const handleFileClick = (file) => {
    setViewerFile(file);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setViewerFile(null);
  };
  
  return (
    <React.Fragment>
      <div className="flex justify-end group">
        <div className={USER_MESSAGE_CLASSES}>
          {/* Text parts */}
          {(message.parts || []).map((part, i) =>
            part.text ? (
              <div key={`${uniqueId}-text-${i}`} className="whitespace-pre-wrap">
                {part.text}
              </div>
            ) : null
          )}
          {!message.parts && message.text && (
            <div className="whitespace-pre-wrap">{message.text}</div>
          )}
          
          {/* Image attachments */}
          {hasImageAttachments && (
            <div className="mt-2 pt-2 border-t border-indigo-400 border-opacity-50">
              <div className="text-xs text-indigo-200 mb-1">Attached images:</div>
              <div className="flex flex-wrap gap-2">
                {message.parts.filter(part => part.fileData && part.fileData.mimeType?.startsWith('image/')).map((part, i) => (
                  <div 
                    key={`${uniqueId}-img-${i}`} 
                    className={IMAGE_CONTAINER_CLASSES}
                    onClick={() => {
                      if (part.fileData && (part.fileData.fileUri || part.fileData.data)) {
                        handleImageClick({
                          mimeType: part.fileData.mimeType,
                          uri: part.fileData.fileUri
                        });
                      }
                    }}
                    title="Click to view full image"
                  >
                    <img 
                      src={part.fileData.fileUri ? (
                        part.fileData.fileUri.includes('generativelanguage.googleapis.com') 
                          ? `${BACKEND_URL}/files/content?fileId=${part.fileData.fileUri.split('/').pop()}` 
                          : `${BACKEND_URL}/files/content?uri=${encodeURIComponent(part.fileData.fileUri)}`
                      ) : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0yNCAyNGgtMjR2LTI0aDI0djI0em0tMTEtN2gtM3YtOGgzdjh6bTUtNmgtM3Y2aDN2LTZ6bS0xMCAyaC0zdjRoM3YtNHoiLz48L3N2Zz4='}
                      alt="Uploaded image"
                      className={IMAGE_PREVIEW_CLASSES}
                      onError={(e) => {
                        console.error('Error loading image:', e);
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0yNCAyNGgtMjR2LTI0aDI0djI0em0tMTEtN2gtM3YtOGgzdjh6bTUtNmgtM3Y2aDN2LTZ6bS0xMCAyaC0zdjRoM3YtNHoiLz48L3N2Zz4=';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Non-image file attachments */}
          {nonImageFiles.length > 0 && (
            <div className="mt-2 pt-2 border-t border-indigo-400 border-opacity-50">
              <FileAttachment 
                files={nonImageFiles} 
                onRemove={() => {}} // No remove functionality in chat history
                readOnly={true} // Hide remove buttons in chat history
                skipTokenCounting={true} // Use cached token counts, don't recalculate
                onFileClick={handleFileClick} // Add file click handler
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Copy icon below user bubble */}
      <div className="flex justify-end mt-1 mb-2">
        <button
          className={COPY_BUTTON_CLASSES}
          title="Copy message"
          onClick={() => handleCopyMessage(
            message.id || uniqueId, 
            (message.parts ? message.parts.map(p => p.text).filter(Boolean).join(' ') : message.text || '')
          )}
        >
          <ClipboardCopy className="w-4 h-4" />
          {copiedMsgId === (message.id || uniqueId) ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      {/* Show streaming logo/animation right after the last user message if streaming/loading */}
      {isLastUser && (isThinking || streamingModelMessageId !== null) && (
        <div className="flex items-center pt-2 pb-2">
          <StreamingApsaraLogo isVisible={true} />
        </div>
      )}

      {/* File Viewer */}
      <FileViewer
        file={viewerFile}
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
      />
    </React.Fragment>
  );
};

export default UserMessage; 