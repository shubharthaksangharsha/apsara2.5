import React, { useEffect, useRef, useState } from 'react';
import ImageModal from '../ImageModal';
import UserMessage from './components/UserMessage';
import ModelMessage from './components/ModelMessage';
import { MESSAGE_TYPES } from './constants';
import { ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Main chat window component that displays conversation messages
 * 
 * @param {Object} props - Component props
 * @param {Object} props.convo - Conversation data containing messages
 * @param {string|null} props.streamingModelMessageId - ID of the message being streamed, if any
 * @param {boolean} props.isLoading - Whether a message is currently being processed
 * @returns {JSX.Element} ChatWindow component
 */
export default function ChatWindow({ convo, streamingModelMessageId, isLoading }) {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState(null);
  const [copiedStates, setCopiedStates] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [scrollDirection, setScrollDirection] = useState('down'); // 'up' or 'down'
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convo?.messages]);

  // Handle scroll events to show/hide scroll button
  useEffect(() => {
    const container = chatContainerRef.current?.closest('.overflow-y-auto');
    
    if (!container) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      const isNearTop = scrollTop < 100;
      
      // Show scroll button if not at the bottom
      setShowScrollButton(!isNearBottom || !isNearTop);
      
      // Determine scroll direction based on position
      if (scrollHeight - scrollTop - clientHeight > 200) {
        setScrollDirection('down');
      } else {
        setScrollDirection('up');
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScroll = () => {
    const container = chatContainerRef.current?.closest('.overflow-y-auto');
    if (!container) return;
    
    if (scrollDirection === 'down') {
      // Scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Scroll to top
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleImageClick = (imageData) => {
    // Ensure we have a valid imageData object before opening modal
    if (imageData && (imageData.data || imageData.uri)) {
      setSelectedImageData(imageData);
      setModalOpen(true);
    } else {
      console.error('Invalid image data for modal:', imageData);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedImageData(null);
  };

  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [id]: false }));
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy code: ', err);
    });
  };

  const toggleCollapse = (sectionId) => {
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleCopyMessage = (msgId, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 1500);
    });
  };

  // Render streaming text with fade-in animation
  const renderStreamingText = (text) => {
    // Split text into words
    const words = text.split(/(\s+)/);
    
    return (
      <div className="streaming-text-container">
        {words.map((word, index) => (
          <span 
            key={index} 
            className="streaming-text-word" 
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {word}
          </span>
        ))}
      </div>
    );
  };

  if (!convo) return null;
  
  // Show animation either during streaming or during regular loading
  const isThinking = streamingModelMessageId !== null || isLoading;

  return (
    <div ref={chatContainerRef} className="max-w-3xl mx-auto w-full space-y-6 pb-4 relative">
      {(convo.messages || []).map((msg, idx, arr) => {
        const uniqueId = msg.id || `msg-${idx}`;
        const isUser = msg.role === MESSAGE_TYPES.USER;
        const isError = msg.role === MESSAGE_TYPES.ERROR;
        const isSystem = msg.role === MESSAGE_TYPES.SYSTEM;
        const isStreaming = msg.id === streamingModelMessageId;
        const isLastUser = isUser && (idx === arr.length - 1 || arr.slice(idx + 1).findIndex(m => m.role === MESSAGE_TYPES.USER) === -1);

        // Render different message types using specialized components
        if (isUser) {
          return (
            <UserMessage 
              key={uniqueId}
              message={msg}
              uniqueId={uniqueId}
              isLastUser={isLastUser}
              isThinking={isThinking}
              streamingModelMessageId={streamingModelMessageId}
              copiedMsgId={copiedMsgId}
              handleCopyMessage={handleCopyMessage}
              handleImageClick={handleImageClick}
            />
          );
        } else {
          return (
            <ModelMessage
              key={uniqueId}
              message={msg}
              uniqueId={uniqueId}
              isSystem={isSystem}
              isError={isError}
              isStreaming={isStreaming}
              copiedMsgId={copiedMsgId}
              handleCopyMessage={handleCopyMessage}
              handleImageClick={handleImageClick}
              collapsedSections={collapsedSections}
              copiedStates={copiedStates}
              handleCopyCode={handleCopyCode}
              toggleCollapse={toggleCollapse}
              renderStreamingText={renderStreamingText}
            />
          );
        }
      })}
      
      <div ref={messagesEndRef} />
      <ImageModal isOpen={modalOpen} onClose={closeModal} imageData={selectedImageData} />
      
      {/* Scroll button */}
      {showScrollButton && (
        <button
          onClick={handleScroll}
          className="fixed bottom-20 right-4 sm:right-8 z-10 p-2 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all duration-200"
          aria-label={scrollDirection === 'down' ? 'Scroll to bottom' : 'Scroll to top'}
        >
          {scrollDirection === 'down' ? (
            <ArrowDown className="h-5 w-5" />
          ) : (
            <ArrowUp className="h-5 w-5" />
          )}
        </button>
      )}
    </div>
  );
}