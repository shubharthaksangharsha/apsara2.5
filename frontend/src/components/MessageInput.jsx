import React, { useState, useRef, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { Send, UploadCloud, Zap } from 'lucide-react';

// Import the new components for image handling
import ImageUploadButton from './ImageUploadButton'; // Assuming path is correct
import ImagePreviewBar from './ImagePreviewBar';   // Assuming path is correct

export default function MessageInput({
  onSend,
  onStreamSend,
  isLoading,
  disabled,
  onFileUploadClick, // This is for general file uploads
  streamEnabled,
  onStreamToggleChange,
  // Props for multi-image upload, passed from App.jsx
  selectedImagesForPrompt,
  onSelectImagesForPrompt,
  onRemoveSelectedImage,
  promptImageUploadStatus, // New prop
}) {
  const [text, setText] = useState('');
  const inputRef = useRef();
  const [inputRows, setInputRows] = useState(1);
  const [isDragging, setIsDragging] = useState(false); // New state for drag-and-drop

  const MAX_INPUT_ROWS = 5; // Max 5 rows
  const BASE_TEXTAREA_HEIGHT_PX = 20; // Approximate height of a single line of text in the textarea
  const PADDING_VERTICAL_PX = 16; // Combined top/bottom padding (8px top + 8px bottom) for textarea

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
    // Only clear text if there are no images, or if text was the primary content.
    // If images are present, text might be a caption, so user might want to edit it for next message.
    // However, for typical chat, clearing text is standard.
    // Let's clear it for now, can be adjusted based on desired UX.
    setText('');
    
    // After sending, reset textarea height to its initial single-line height
    if(inputRef.current) {
      inputRef.current.style.height = 'auto'; // Reset first
      inputRef.current.style.height = `${BASE_TEXTAREA_HEIGHT_PX + PADDING_VERTICAL_PX}px`; // Then set to min
    }
    setInputRows(1);

    // onSend and onStreamSend in App.jsx now handle image uploads before sending the message
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
  
  return (
    <div 
      className={`border-t border-gray-200 dark:border-gray-700 px-2 py-2 sm:px-4 sm:py-3 bg-gray-50 dark:bg-gray-800 sticky bottom-0 z-10 ${isDragging ? 'outline-dashed outline-2 outline-indigo-500 dark:outline-indigo-400' : ''}`}
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
          uploadStatus={promptImageUploadStatus} // Pass status down
        />
      )}
      <div className="max-w-3xl mx-auto">
        <div className={`flex items-end gap-1 sm:gap-2 bg-white dark:bg-gray-700 rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 ${isDragging ? 'pointer-events-none' : ''}`}> {/* Disable pointer events on children when dragging */}
          <textarea
            ref={inputRef}
            className="flex-1 w-full resize-none py-1.5 sm:py-2 px-2 sm:px-3 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none custom-scrollbar placeholder-gray-500 dark:placeholder-gray-400 text-sm"
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
            {/* Button for general file upload (existing) */}
            <button
              onClick={onFileUploadClick} // This triggers the FileUploadPopup for general files
              disabled={isLoading || disabled}
              className="p-1.5 sm:p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition group disabled:opacity-50"
              title="Attach General File"
            >
              <UploadCloud className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* New Image Upload Button for prompt images */}
            <ImageUploadButton 
              onFilesSelected={onSelectImagesForPrompt} 
              multiple={true} 
            />
            
            <Switch.Group as="div" className="flex items-center">
              <Switch
                checked={streamEnabled}
                onChange={onStreamToggleChange}
                disabled={isLoading || disabled}
                className={`${streamEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-500'}
                  relative inline-flex h-[20px] w-[36px] sm:h-[22px] sm:w-[40px] shrink-0 cursor-pointer rounded-full border-2 border-transparent
                  transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 
                  focus-visible:ring-white/75 disabled:opacity-50`}
              >
                <span className="sr-only">Toggle Streaming</span>
                <Zap className={`absolute top-0.5 left-0.5 h-3 w-3 sm:h-4 sm:w-4 text-yellow-300 transition-opacity ${streamEnabled ? 'opacity-100' : 'opacity-0'}`} />
                <span className={`pointer-events-none inline-block h-[16px] w-[16px] sm:h-[18px] sm:w-[18px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${streamEnabled ? 'translate-x-[16px] sm:translate-x-[18px]' : 'translate-x-0'}`} />
              </Switch>
            </Switch.Group>
            <button
              onClick={handleSend}
              disabled={isLoading || disabled || 
                        (!text.trim() && (!selectedImagesForPrompt || !selectedImagesForPrompt.some(img => img.id && promptImageUploadStatus[img.name] === 'success'))) || 
                        (selectedImagesForPrompt && selectedImagesForPrompt.some(img => promptImageUploadStatus[img.name] === 'uploading' || promptImageUploadStatus[img.name] === 'pending'))
                       }
              className="p-1.5 sm:p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition group disabled:opacity-50"
              title="Send Message"
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>
      {isDragging && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 dark:bg-gray-800/80 pointer-events-none">
          <UploadCloud className="h-16 w-16 text-indigo-500 dark:text-indigo-400 mb-2" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Drop images here</p>
        </div>
      )}
    </div>
  );
}