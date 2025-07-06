import React, { useEffect, useRef, useState } from 'react';
import ImageModal from '../ImageModal';
import UserMessage from './components/UserMessage';
import ModelMessage from './components/ModelMessage';
import { MESSAGE_TYPES } from './constants';

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
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState(null);
  const [copiedStates, setCopiedStates] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convo?.messages]);

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
    <div className="max-w-3xl mx-auto w-full space-y-6 pb-4">
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
    </div>
  );
}