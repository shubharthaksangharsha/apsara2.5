import { useState, useRef, useCallback } from 'react';

export const useMessaging = () => {
  // State
  const [liveMessages, setLiveMessages] = useState([]);
  
  // Refs
  const liveStreamingTextRef = useRef('');
  const liveStreamingMsgIdRef = useRef(null);

  // --- Memoized Utility Functions ---
  const addLiveMessage = useCallback((msg) => {
    // console.log(`➕ Adding new message ID ${msg.id}, text: "${msg.text?.substring(0, 20)}..."`);
    setLiveMessages(prev => [...prev, { ...msg, id: msg.id || (Date.now() + Math.random() * 1000), timestamp: Date.now() }]);
  }, []);

  // --- MODIFIED updateLiveMessage ---
  const updateLiveMessage = useCallback((id, updates) => {
    setLiveMessages(prevMessages => {
      const index = prevMessages.findIndex(msg => msg.id === id);
      if (index === -1) {
        console.warn(`[Live WS] updateLiveMessage: Message with ID ${id} not found! Cannot update. Updates:`, updates);
        return prevMessages;
      }

      const updatedMessages = [...prevMessages];
      const currentMessage = updatedMessages[index];
      const updatedMessage = { ...currentMessage }; // Clone the message

      // Ensure parts array exists
      updatedMessage.parts = updatedMessage.parts ? [...updatedMessage.parts] : [];

      // Handle incoming text updates specifically for parts
      if (updates.text) {
          const lastPartIndex = updatedMessage.parts.length - 1;
          // Check if the last part is a text part and append to it
          if (lastPartIndex >= 0 && updatedMessage.parts[lastPartIndex].text !== undefined) {
              updatedMessage.parts[lastPartIndex] = {
                  ...updatedMessage.parts[lastPartIndex],
                  text: updatedMessage.parts[lastPartIndex].text + updates.text
              };
              // console.log(`[Live WS] Appended text to last part of message ${id}`);
      } else {
              // If no parts, or last part isn't text, add a new text part
              updatedMessage.parts.push({ text: updates.text });
              // console.log(`[Live WS] Added new text part to message ${id}`);
          }
          // Remove the top-level text property from updates as it's handled in parts
          delete updates.text;
      }

      // Handle incoming parts updates (like images, code blocks) - merge them
      if (updates.parts) {
          updatedMessage.parts = [...updatedMessage.parts, ...updates.parts];
          //  console.log(`[Live WS] Added ${updates.parts.length} new parts to message ${id}`);
          delete updates.parts; // Remove parts from general updates
      }

      // Apply any other remaining updates (e.g., metadata, though less common here)
        updatedMessages[index] = {
          ...updatedMessage,
          ...Object.fromEntries(Object.entries(updates).filter(([key]) => key !== 'id'))
        };

      return updatedMessages;
    });
  }, []);

  // --- Unified Message Update Logic (Handles potential multiple parts) ---
  const addOrUpdateLiveModelMessagePart = useCallback((part) => {
      setLiveMessages(prevMessages => {
          const streamId = liveStreamingMsgIdRef.current;

          if (!streamId) { // Start new message if no streaming ID exists
              const newMsgId = Date.now() + Math.random() + '_live_model';
              liveStreamingMsgIdRef.current = newMsgId;
              console.log(`✨ Starting new model message (ID: ${newMsgId}) with part:`, part);
              // Ensure the first part is wrapped correctly
              return [...prevMessages, { role: 'model', parts: [part], id: newMsgId }];
          } else { // Append or update existing message
              const index = prevMessages.findIndex(msg => msg.id === streamId);
              if (index === -1) {
                  console.warn(`[Live WS] addOrUpdateLiveModelMessagePart: Message with ID ${streamId} not found. Starting new.`);
                   const newMsgId = Date.now() + Math.random() + '_live_model_fallback';
                   liveStreamingMsgIdRef.current = newMsgId;
                   return [...prevMessages, { role: 'model', parts: [part], id: newMsgId }];
              }

              const updatedMessages = [...prevMessages];
              const currentMessage = updatedMessages[index];
              const updatedMessage = { ...currentMessage };
              updatedMessage.parts = updatedMessage.parts ? [...updatedMessage.parts] : [];

              // If the incoming part is text, append to the last text part if possible
              if (part.text) {
                  const lastPartIndex = updatedMessage.parts.length - 1;
                   if (lastPartIndex >= 0 && updatedMessage.parts[lastPartIndex].text !== undefined) {
                       updatedMessage.parts[lastPartIndex] = {
                           ...updatedMessage.parts[lastPartIndex],
                           text: updatedMessage.parts[lastPartIndex].text + part.text
                       };
                       console.log(`➡️ Appended text part via addOrUpdate to message ${streamId}`);
                   } else {
                       updatedMessage.parts.push(part); // Add as new part if last wasn't text
                      //  console.log(`➡️ Added new text part via addOrUpdate to message ${streamId}`);
                   }
              } else {
                   // For non-text parts (images, code), just append
                   updatedMessage.parts.push(part);
                  //  console.log(`➡️ Added new non-text part via addOrUpdate to message ${streamId}:`, part);
              }

              updatedMessages[index] = updatedMessage;
              return updatedMessages;
          }
      });
  }, []);

  // Reset streaming refs function
  const resetStreamingRefs = useCallback(() => {
    liveStreamingTextRef.current = '';
    liveStreamingMsgIdRef.current = null;
  }, []);

  return {
    // State
    liveMessages,
    
    // Functions
    setLiveMessages,
    addLiveMessage,
    updateLiveMessage,
    addOrUpdateLiveModelMessagePart,
    resetStreamingRefs,
    
    // Refs
    liveStreamingTextRef,
    liveStreamingMsgIdRef
  };
}; 