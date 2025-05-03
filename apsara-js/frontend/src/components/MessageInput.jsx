import React, { useState, useRef, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { Send, UploadCloud, CornerDownLeft, Loader2, Mic, MicOff, Paperclip, Image as ImageIcon, Text, Zap } from 'lucide-react';

export default function MessageInput({ onSend, onStreamSend, isLoading, disabled, onFileUploadClick, streamEnabled, onStreamToggleChange }) {
  const [text, setText] = useState('');
  const inputRef = useRef();
  const [useStreaming, setUseStreaming] = useState(false); // Default to false or read from localStorage?
  const [inputRows, setInputRows] = useState(1); // For dynamic height

  const MAX_INPUT_ROWS = 6; // Limit the max height

  // Adjust textarea height
  useEffect(() => {
    if (inputRef.current) {
      // Temporarily reset height to calculate scrollHeight correctly
      inputRef.current.style.height = 'auto';
      const scrollHeight = inputRef.current.scrollHeight;
      const lineHeight = parseInt(window.getComputedStyle(inputRef.current).lineHeight, 10) || 20; // Estimate line height
      const newRows = Math.min(MAX_INPUT_ROWS, Math.max(1, Math.ceil(scrollHeight / lineHeight)));
      
      // Only update if rows changed to avoid unnecessary style updates
      if (newRows !== inputRows) {
         setInputRows(newRows);
         // Set explicit height based on rows * lineHeight (or use scrollHeight directly if preferred)
         // Using scrollHeight directly can be simpler:
         inputRef.current.style.height = `${Math.min(scrollHeight, MAX_INPUT_ROWS * lineHeight)}px`;
      }
    }
  }, [text, inputRows]); // Re-run when text changes


  const handleSend = () => {
    if (!text.trim() || isLoading || disabled) return;
    
    const messageToSend = text.trim();
    setText(''); // Clear input immediately
    setInputRows(1); // Reset rows
    inputRef.current.style.height = 'auto'; // Reset height

    if (streamEnabled) {
      onStreamSend(messageToSend);
    } else {
      onSend(messageToSend);
    }
  };
  
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-2 sm:p-4 bg-white dark:bg-gray-800">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            className="flex-1 w-full resize-none p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm overflow-y-auto custom-scrollbar" // Added overflow-y-auto and custom-scrollbar
            placeholder={
              disabled ? "Select or start a conversation..." : 
              isLoading ? "Apsara is thinking..." : 
              "Type your message (Shift+Enter for new line)..."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={inputRows} // Dynamic rows
            disabled={isLoading || disabled}
            style={{ maxHeight: `${MAX_INPUT_ROWS * 20}px`, minHeight: '44px' }} // Adjusted maxHeight
          />
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={onFileUploadClick}
              disabled={isLoading || disabled}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition group disabled:opacity-50 disabled:cursor-not-allowed"
              title="Attach File (Not yet functional for sending with message)" // Updated title
            >
              <UploadCloud className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:scale-110" />
            </button>
            <Switch.Group as="div" className="flex items-center ml-2 flex-shrink-0">
              <Switch
                checked={streamEnabled}
                onChange={onStreamToggleChange}
                disabled={isLoading || disabled}
                className={`${streamEnabled ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}
                  relative inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                  transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 
                  focus-visible:ring-white/75 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="sr-only">Toggle Streaming</span>
                <Zap className={`absolute top-1/2 left-0.5 transform -translate-y-1/2 h-3 w-3 text-yellow-300 transition-opacity ${streamEnabled ? 'opacity-100' : 'opacity-0'}`} />
                <span className={`pointer-events-none inline-block h-[16px] w-[16px] transform rounded-full bg-white dark:bg-gray-300 shadow-lg ring-0 transition duration-200 ease-in-out ${streamEnabled ? 'translate-x-[16px]' : 'translate-x-0'}`} />
              </Switch>
            </Switch.Group>
            <button
              onClick={handleSend}
              disabled={isLoading || disabled || !text.trim()}
              className="p-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition group disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send Message"
            >
              <Send className="h-5 w-5 transition-transform duration-150 ease-in-out group-hover:translate-x-0.5 group-hover:scale-105" />
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center hidden sm:block">
          {streamEnabled ? "Streaming mode: Responses appear in real-time." : "Tip: Shift+Enter for a new line."}
        </div>
      </div>
    </div>
  );
}