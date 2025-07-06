import React, { useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

/**
 * ChatTab component that displays the chat messages
 * 
 * @param {Object} props - Component props
 * @param {Array} props.messages - Messages to display
 * @param {boolean} props.isSessionActive - Whether a session is active
 * @param {Function} props.renderChatMessageContent - Function to render message content
 * @returns {JSX.Element} ChatTab component
 */
const ChatTab = ({ messages, isSessionActive, renderChatMessageContent }) => {
  const messagesEndRef = useRef(null);

  // Filter messages to only show relevant ones for chat tab
  const chatTabMessages = messages.filter(msg => {
    // Keep user, error, and icon'd system messages
    if (msg.role === 'user') return true;
    if (msg.role === 'error') return true;
    if (msg.role === 'system' && msg.icon) return true;
    // Include model messages, renderChatMessageContent will handle showing only text parts
    if (msg.role === 'model') return true;
    return false;
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  return (
    <div className="space-y-2.5 sm:space-y-3">
      {chatTabMessages.length === 0 && !isSessionActive && (
        <div className="text-center text-gray-500 dark:text-gray-400 p-4 flex flex-col items-center justify-center h-full">
          <Info size={32} className="mb-2 text-gray-400 dark:text-gray-500"/>
          Configure settings in the right panel and click <b>Start Session</b>.
        </div>
      )}
      
      {chatTabMessages.map((msg) => {
        // renderChatMessageContent handles filtering parts,
        // but we need to check if it returned null (meaning no text parts)
        const chatContent = renderChatMessageContent(msg);
        if (!chatContent) return null; // Don't render the message container if no content

        return (
          <div key={msg.id + '-chat'} className={`group flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
            <div className={`max-w-[85%] px-3.5 py-1.5 rounded-xl shadow-md text-sm ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white rounded-br-lg' 
                : msg.role === 'model' 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600' 
                  : msg.role === 'error' 
                    ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-600' 
                    : 'bg-gray-100 dark:bg-gray-600/50 text-gray-600 dark:text-gray-300 italic text-xs'
            } hover:shadow-lg`} style={{ minWidth: 70 }}>
              {chatContent}
            </div>
          </div>
        );
      }).filter(Boolean)} {/* Remove null entries */}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatTab; 