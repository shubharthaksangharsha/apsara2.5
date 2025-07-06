import React, { useState, useRef, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { Send, Zap, FolderOpen, UploadCloud } from 'lucide-react';

// Import the components for image handling
import ImageUploadButton from '../ImageUpload';
import { ImagePreviewBar } from '../ImagePreview';
import FileAttachment from '../FileAttachment';

// Import constants
import {
  MAX_INPUT_ROWS,
  BASE_TEXTAREA_HEIGHT_PX,
  PADDING_VERTICAL_PX,
  CONTAINER_CLASS,
  DRAGGING_CLASS,
  INPUT_WRAPPER_CLASS,
  TEXTAREA_CLASS,
  ACTION_BUTTON_CLASS,
  SEND_BUTTON_CLASS,
  SWITCH_ACTIVE_CLASS,
  SWITCH_INACTIVE_CLASS,
  SWITCH_BASE_CLASS,
  SWITCH_ICON_CLASS,
  SWITCH_HANDLE_CLASS,
  SWITCH_HANDLE_ACTIVE_CLASS,
  SWITCH_HANDLE_INACTIVE_CLASS,
  DROP_OVERLAY_CLASS
} from './constants';

/**
 * Message input component with streaming toggle, file upload, and drag-and-drop support
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onSend - Handler for sending messages (non-streaming mode)
 * @param {Function} props.onStreamSend - Handler for sending messages (streaming mode)
 * @param {boolean} props.isLoading - Whether a message is currently being processed
 * @param {boolean} props.disabled - Whether the input is disabled (no active conversation)
 * @param {Function} props.onFileManagerClick - Handler for file manager button
 * @param {boolean} props.streamEnabled - Whether streaming mode is enabled
 * @param {Function} props.onStreamToggleChange - Handler for toggling streaming mode
 * @param {Array} props.selectedImagesForPrompt - List of images selected for the current prompt
 * @param {Function} props.onSelectImagesForPrompt - Handler for selecting images
 * @param {Function} props.onRemoveSelectedImage - Handler for removing a selected image
 * @param {Object} props.promptImageUploadStatus - Status of image uploads {'filename': 'success'|'error'|'uploading'|'pending'}
 * @param {Array} props.attachedFiles - List of attached files (PDFs, documents, etc.)
 * @param {Function} props.onRemoveAttachedFile - Handler for removing an attached file
 * @returns {JSX.Element} MessageInput component
 */
export default function MessageInput({
  onSend,
  onStreamSend,
  isLoading,
  disabled,
  onFileManagerClick,
  streamEnabled,
  onStreamToggleChange,
  selectedImagesForPrompt,
  onSelectImagesForPrompt,
  onRemoveSelectedImage,
  promptImageUploadStatus,
  attachedFiles,
  onRemoveAttachedFile,
}) {
  const [text, setText] = useState('');
  const inputRef = useRef();
  const [inputRows, setInputRows] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'; // Reset height to calculate scrollHeight
      const scrollHeight = inputRef.current.scrollHeight;
      // Calculate desired height based on content, up to MAX_INPUT_ROWS
      const desiredHeight = Math.min(
        scrollHeight,
        (MAX_INPUT_ROWS * BASE_TEXTAREA_HEIGHT_PX) + PADDING_VERTICAL_PX
      );
      inputRef.current.style.height = `${desiredHeight}px`;

      // Update rows state if needed (though direct height manipulation is primary)
      const newRows = Math.min(MAX_INPUT_ROWS, Math.max(1, Math.ceil((scrollHeight - PADDING_VERTICAL_PX) / BASE_TEXTAREA_HEIGHT_PX)));
      if (newRows !== inputRows) {
         setInputRows(newRows);
      }
    }
  }, [text]); // Removed inputRows from dependency to avoid potential loop, direct height set is fine.

  const handleSend = () => {
    // Check if there's text OR at least one successfully uploaded image
    const hasSuccessfullyUploadedImages = selectedImagesForPrompt && selectedImagesForPrompt.some(img => img.id && promptImageUploadStatus[img.name] === 'success');
    if (!text.trim() && !hasSuccessfullyUploadedImages) return;
    
    // Check if any image is still uploading
    const isAnyImageUploading = selectedImagesForPrompt && selectedImagesForPrompt.some(img => promptImageUploadStatus[img.name] === 'uploading' || promptImageUploadStatus[img.name] === 'pending');
    if (isLoading || disabled || isAnyImageUploading) return;
    
    const messageToSend = text.trim();
    setText('');
    
    // After sending, reset textarea height to its initial single-line height
    if(inputRef.current) {
      inputRef.current.style.height = 'auto'; // Reset first
      inputRef.current.style.height = `${BASE_TEXTAREA_HEIGHT_PX + PADDING_VERTICAL_PX}px`; // Then set to min
    }
    setInputRows(1);

    // Send the message using the appropriate handler
    if (streamEnabled) {
      onStreamSend(messageToSend);
    } else {
      onSend(messageToSend);
    }
  };
  
  // Drag and Drop Handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Basic check to prevent flickering when dragging over child elements
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // You can add visual cues here if needed, e.g., by setting a class on the drop zone
    if (!isDragging) setIsDragging(true); // Ensure dragging state is true
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      onSelectImagesForPrompt(files);
    }
  };

  // Determine if the send button should be disabled
  const isSendDisabled = isLoading || 
                        disabled || 
                        (!text.trim() && (!selectedImagesForPrompt || !selectedImagesForPrompt.some(img => img.id && promptImageUploadStatus[img.name] === 'success'))) || 
                        (selectedImagesForPrompt && selectedImagesForPrompt.some(img => promptImageUploadStatus[img.name] === 'uploading' || promptImageUploadStatus[img.name] === 'pending'));
  
  return (
    <div 
      className={`${CONTAINER_CLASS} ${isDragging ? DRAGGING_CLASS : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Image Preview Bar - Renders above the input area if images are selected */}
      {selectedImagesForPrompt && selectedImagesForPrompt.length > 0 && (
        <ImagePreviewBar 
          files={selectedImagesForPrompt} 
          onRemoveFile={onRemoveSelectedImage} 
          uploadStatus={promptImageUploadStatus}
        />
      )}

      {/* File Attachment Display - Shows attached files (PDFs, documents, etc.) */}
      {attachedFiles && attachedFiles.length > 0 && (
        <div className="max-w-3xl mx-auto mb-2">
          <FileAttachment 
            files={attachedFiles} 
            onRemove={onRemoveAttachedFile}
          />
        </div>
      )}
      <div className="max-w-3xl mx-auto">
        <div className={`${INPUT_WRAPPER_CLASS} ${isDragging ? 'pointer-events-none' : ''}`}>
          <textarea
            ref={inputRef}
            className={TEXTAREA_CLASS}
            placeholder={
              disabled ? "Select a conversation..." :
              isLoading ? "Apsara is thinking..." : 
              "Type your message..."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            disabled={isLoading || disabled}
            style={{
              minHeight: `${BASE_TEXTAREA_HEIGHT_PX + PADDING_VERTICAL_PX}px`,
              maxHeight: `${(MAX_INPUT_ROWS * BASE_TEXTAREA_HEIGHT_PX) + PADDING_VERTICAL_PX}px`,
              lineHeight: `${BASE_TEXTAREA_HEIGHT_PX}px`,
            }}
          />
          <div className="flex items-center gap-1 p-1 flex-shrink-0">
            {/* Button for file manager */}
            {onFileManagerClick && (
              <button
                onClick={onFileManagerClick}
                disabled={isLoading || disabled}
                className={ACTION_BUTTON_CLASS}
                title="Upload & Manage Files"
              >
                <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}

            {/* Image Upload Button for prompt images */}
            <ImageUploadButton 
              onFilesSelected={onSelectImagesForPrompt} 
              multiple={true} 
            />
            
            {/* Streaming toggle switch */}
            <Switch.Group as="div" className="flex items-center">
              <Switch
                checked={streamEnabled}
                onChange={onStreamToggleChange}
                disabled={isLoading || disabled}
                className={`${streamEnabled ? SWITCH_ACTIVE_CLASS : SWITCH_INACTIVE_CLASS} ${SWITCH_BASE_CLASS}`}
              >
                <span className="sr-only">Toggle Streaming</span>
                <Zap className={`${SWITCH_ICON_CLASS} ${streamEnabled ? 'opacity-100' : 'opacity-0'}`} />
                <span className={`${SWITCH_HANDLE_CLASS} ${streamEnabled ? SWITCH_HANDLE_ACTIVE_CLASS : SWITCH_HANDLE_INACTIVE_CLASS}`} />
              </Switch>
            </Switch.Group>
            
            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={isSendDisabled}
              className={SEND_BUTTON_CLASS}
              title="Send Message"
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Drag and drop overlay */}
      {isDragging && (
        <div className={DROP_OVERLAY_CLASS}>
          <UploadCloud className="h-16 w-16 text-indigo-500 dark:text-indigo-400 mb-2" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Drop images here</p>
        </div>
      )}
    </div>
  );
} 