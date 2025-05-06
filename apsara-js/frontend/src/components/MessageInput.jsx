import React, { useState, useRef, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { Send, UploadCloud, Zap } from 'lucide-react';

export default function MessageInput({ onSend, onStreamSend, isLoading, disabled, onFileUploadClick, streamEnabled, onStreamToggleChange }) {
  const [text, setText] = useState('');
  const inputRef = useRef();
  const [inputRows, setInputRows] = useState(1);

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
    if (!text.trim() || isLoading || disabled) return;
    const messageToSend = text.trim();
    setText('');
    // After sending, reset textarea height to its initial single-line height
    if(inputRef.current) {
      inputRef.current.style.height = 'auto'; // Reset first
      inputRef.current.style.height = `${BASE_TEXTAREA_HEIGHT_PX + PADDING_VERTICAL_PX}px`; // Then set to min
    }
    setInputRows(1);


    if (streamEnabled) {
      onStreamSend(messageToSend);
    } else {
      onSend(messageToSend);
    }
  };
  
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 px-2 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-800">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 bg-white dark:bg-gray-700 rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
          <textarea
            ref={inputRef}
            className="flex-1 w-full resize-none py-2 px-3 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none custom-scrollbar placeholder-gray-500 dark:placeholder-gray-400"
            placeholder={
              disabled ? "Select a conversation..." :
              isLoading ? "Apsara is thinking..." : 
              "Type your message..." // Simplified placeholder
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1} // Start with 1 row, height is controlled by style
            disabled={isLoading || disabled}
            style={{
              minHeight: `${BASE_TEXTAREA_HEIGHT_PX + PADDING_VERTICAL_PX}px`,
              maxHeight: `${(MAX_INPUT_ROWS * BASE_TEXTAREA_HEIGHT_PX) + PADDING_VERTICAL_PX}px`,
              lineHeight: `${BASE_TEXTAREA_HEIGHT_PX}px`, // Explicit line height
            }}
          />
          <div className="flex items-center gap-1 p-1 flex-shrink-0"> {/* Reduced padding */}
            <button
              onClick={onFileUploadClick}
              disabled={isLoading || disabled}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition group disabled:opacity-50"
              title="Attach File"
            >
              <UploadCloud className="h-5 w-5" />
            </button>
            <Switch.Group as="div" className="flex items-center">
              <Switch
                checked={streamEnabled}
                onChange={onStreamToggleChange}
                disabled={isLoading || disabled}
                className={`${streamEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-500'}
                  relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer rounded-full border-2 border-transparent
                  transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 
                  focus-visible:ring-white/75 disabled:opacity-50`}
              >
                <span className="sr-only">Toggle Streaming</span>
                <Zap className={`absolute top-0.5 left-0.5 h-4 w-4 text-yellow-300 transition-opacity ${streamEnabled ? 'opacity-100' : 'opacity-0'}`} />
                <span className={`pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${streamEnabled ? 'translate-x-[18px]' : 'translate-x-0'}`} />
              </Switch>
            </Switch.Group>
            <button
              onClick={handleSend}
              disabled={isLoading || disabled || !text.trim()}
              className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition group disabled:opacity-50"
              title="Send Message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
        {/* Removed the "Tip: Shift+Enter..." for a cleaner look, can be added back if desired */}
      </div>
    </div>
  );
}