import React, { useState, useRef, useEffect } from 'react';
import { Send, FolderOpen, UploadCloud, Square, Zap, Sparkles, AudioLines } from 'lucide-react';

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
  DROP_OVERLAY_CLASS
} from './constants';

/**
 * Message input component with file upload and drag-and-drop support
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onSend - Handler for sending messages (redirects to streaming)
 * @param {Function} props.onStreamSend - Handler for sending messages with streaming
 * @param {boolean} props.isLoading - Whether a message is currently being processed
 * @param {boolean} props.disabled - Whether the input is disabled (no active conversation)
 * @param {Function} props.onFileManagerClick - Handler for file manager button
 * @param {Array} props.selectedImagesForPrompt - List of images selected for the current prompt
 * @param {Function} props.onSelectImagesForPrompt - Handler for selecting images
 * @param {Function} props.onRemoveSelectedImage - Handler for removing a selected image
 * @param {Object} props.promptImageUploadStatus - Status of image uploads {'filename': 'success'|'error'|'uploading'|'pending'}
 * @param {Array} props.attachedFiles - List of attached files (PDFs, documents, etc.)
 * @param {Function} props.onRemoveAttachedFile - Handler for removing an attached file
 * @param {Function} props.onStopRequest - Handler for stopping ongoing requests
 * @param {boolean} props.enableThinking - Whether thinking mode is enabled
 * @param {Function} props.onToggleThinking - Handler for toggling thinking mode
 * @param {boolean} props.enableTools - Whether tools are enabled
 * @param {Function} props.onToggleTools - Handler for toggling tools
 * @param {number} props.thinkingBudget - Current thinking budget value (-1 for auto, 0 for disabled, >0 for specific budget)
 * @param {boolean} props.isThinkingSupported - Whether thinking is supported by the current model
 * @param {Function} props.onStartLiveChat - Handler for starting a live chat session
 */
export default function MessageInput({
  onSend,
  onStreamSend,
  isLoading,
  disabled,
  onFileManagerClick,
  selectedImagesForPrompt,
  onSelectImagesForPrompt,
  onRemoveSelectedImage,
  promptImageUploadStatus,
  attachedFiles,
  onRemoveAttachedFile,
  onStopRequest,
  enableThinking = false,
  onToggleThinking,
  enableTools = false,
  onToggleTools,
  thinkingBudget = 0,
  isThinkingSupported = false,
  onStartLiveChat
}) {
  const [text, setText] = useState('');
  const inputRef = useRef();
  const [inputRows, setInputRows] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  
  // Determine thinking mode based on enableThinking and thinkingBudget
  const thinkingMode = !enableThinking ? 'off' : (thinkingBudget === -1 ? 'auto' : 'on');

  // Handle cycling through thinking modes
  const handleThinkingModeToggle = () => {
    if (!isThinkingSupported) return;
    
    if (thinkingMode === 'off') {
      // Off -> On: Enable thinking with default budget
      onToggleThinking(true, 1024); // Enable with a default budget
    } else if (thinkingMode === 'on') {
      // On -> Auto: Enable thinking with dynamic budget
      onToggleThinking(true, -1); // Enable with dynamic budget (-1)
    } else {
      // Auto -> Off: Disable thinking
      onToggleThinking(false, 0); // Disable thinking
    }
  };

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

    // Always use the streaming handler now
    onStreamSend(messageToSend);
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
  
  // Determine which button to show (Live Chat, Send, or Stop)
  const renderActionButton = () => {
    if (isLoading && onStopRequest) {
      return (
        <button
          onClick={onStopRequest}
          className="p-2 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-600 dark:text-red-300"
          title="Stop Request"
        >
          <Square className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      );
    } else if (text.trim() || (selectedImagesForPrompt && selectedImagesForPrompt.length > 0)) {
      return (
        <button
          onClick={handleSend}
          disabled={isSendDisabled}
          className={SEND_BUTTON_CLASS}
          title="Send Message"
        >
          <Send className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      );
    } else {
      return (
        <button
          onClick={onStartLiveChat}
          disabled={disabled}
          className="p-2 rounded-lg bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-800 dark:hover:bg-indigo-700 text-indigo-600 dark:text-indigo-400"
          title="Start Live Chat"
        >
          <AudioLines className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      );
    }
  };
  
  return (
    <div 
      className={`${CONTAINER_CLASS} ${isDragging ? DRAGGING_CLASS : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
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
      
      {/* Main input container */}
      <div className="max-w-3xl mx-auto">
        <div className={`${INPUT_WRAPPER_CLASS} ${isDragging ? 'pointer-events-none' : ''} py-3 px-3`}>
          {/* Left-side tools */}
          <div className="flex items-center pl-1 gap-2">
            {/* Plus button */}
            {onFileManagerClick && (
              <button
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={onFileManagerClick}
                title="Upload & Manage Files"
              >
                <FolderOpen className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Text input area */}
          <textarea
            ref={inputRef}
            className={TEXTAREA_CLASS}
            placeholder={
              disabled ? "Select a conversation..." :
              isLoading ? "Apsara is thinking..." : 
              "Ask Apsara anything..."
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
              minHeight: `${BASE_TEXTAREA_HEIGHT_PX + PADDING_VERTICAL_PX + 10}px`,
              maxHeight: `${(MAX_INPUT_ROWS * BASE_TEXTAREA_HEIGHT_PX) + PADDING_VERTICAL_PX + 10}px`,
              lineHeight: `${BASE_TEXTAREA_HEIGHT_PX}px`,
            }}
          />
            
          {/* Dynamic action button (Live Chat, Send, or Stop) */}
          {renderActionButton()}
        </div>
      </div>
      
      {/* Tool buttons below the input - now as a separate row without a border */}
      <div className="flex justify-center items-center gap-6 mt-1 mb-1">
        {/* Thinking mode toggle with different states */}
        <button
          className={`p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex flex-col items-center ${
            !isThinkingSupported ? "opacity-50 cursor-not-allowed" :
            thinkingMode === 'off' ? "text-gray-500 dark:text-gray-400" :
            "text-indigo-500 dark:text-indigo-400"
          }`}
          onClick={handleThinkingModeToggle}
          title={!isThinkingSupported ? "Thinking not supported by this model" :
                thinkingMode === 'off' ? "Enable thinking mode" :
                thinkingMode === 'on' ? "Switch to auto thinking mode" :
                "Disable thinking mode"}
          disabled={!isThinkingSupported}
        >
          <div className="relative">
            <Sparkles className={`h-4 w-4 ${thinkingMode !== 'off' ? 'animate-pulse' : ''}`} />
          </div>
          <span className="text-xs">Thinking</span>
          {thinkingMode === 'auto' && (
            <span className="text-[10px] -mt-0.5 text-indigo-400">AUTO</span>
          )}
        </button>
        
        {/* Plugins toggle (renamed from Tools) */}
        <button
          className={`p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1.5 ${
            enableTools
              ? "text-indigo-500 dark:text-indigo-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
          onClick={onToggleTools}
          title={`${enableTools ? "Disable" : "Enable"} plugins`}
        >
          <Zap className="h-4 w-4" />
          <span className="text-xs">Plugins</span>
        </button>
      </div>
      
      {/* Drop overlay */}
      {isDragging && (
        <div className={DROP_OVERLAY_CLASS}>
          <div className="flex flex-col items-center justify-center space-y-2">
            <UploadCloud className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <p className="text-center text-gray-700 dark:text-gray-300">Drop files to upload</p>
          </div>
        </div>
      )}
    </div>
  );
} 