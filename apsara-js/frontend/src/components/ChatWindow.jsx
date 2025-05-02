import React, { useEffect, useRef } from 'react';

export default function ChatWindow({ convo }) {
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convo?.messages]); // Add safe navigation

  if (!convo) return null;
  
  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      {/* Ensure messages array exists before mapping */}
      {(convo.messages || []).map((msg, idx) => ( 
        <div
          key={msg.id || idx} // Use message ID if available, fallback to index
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 break-words ${ // Added break-words
              msg.role === 'user' 
                ? 'bg-indigo-500 text-white' 
                : msg.role === 'error'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : msg.role === 'system'
                ? 'bg-gray-200 dark:bg-gray-700 italic text-sm text-gray-600 dark:text-gray-300' // Adjusted system style
                : 'bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700'
            }`}
          >
            {/* Ensure parts array exists before mapping */}
            {(msg.parts || []).map((part, i) => { 
              if (part.text) {
                return (
                  <div key={`${msg.id || idx}-text-${i}`} className="whitespace-pre-wrap">
                    {part.text}
                  </div>
                );
              } 
              else if (part.inlineData?.mimeType?.startsWith('image/')) {
                return (
                  <div key={`${msg.id || idx}-img-${i}`} className="my-2"> 
                    <img 
                      src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
                      alt="Generated content" 
                      className="max-w-full h-auto rounded-md" 
                    />
                  </div>
                );
              } 
              else {
                return null; 
              }
            })}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}