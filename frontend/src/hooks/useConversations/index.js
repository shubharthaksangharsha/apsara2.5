import { useState, useEffect } from 'react';
import { loadConversations, saveConversations } from './storage-utils';
import { 
  addConversation,
  deleteConversation,
  updateConversationTitle,
  toggleConversationPin
} from './conversation-management';

/**
 * Hook for managing conversations
 * 
 * @returns {Object} - Conversations state and management functions
 */
export function useConversations() {
  // Initialize conversations from localStorage
  const [convos, setConvos] = useState(() => loadConversations());

  // Initialize active conversation ID
  const [activeConvoId, setActiveConvoId] = useState(() =>
    convos.length > 0 ? convos[0].id : null
  );

  // Effect to save conversations and handle pruning
  useEffect(() => {
    const saveResult = saveConversations(convos, activeConvoId);
    
    // Handle pruning notifications if needed
    if (saveResult.pruned) {
      console.warn(`Storage limit reached: ${saveResult.prunedIds.length} conversations pruned`);

      // If the active conversation was pruned, update activeConvoId
      if (saveResult.activeIdPruned) {
        const newActiveId = convos.length > 0 ? convos[0].id : null;
        setActiveConvoId(newActiveId);
        if (newActiveId !== activeConvoId) { // Check if ID actually changed
          console.warn("The active conversation was removed due to storage limits. Switched to the newest conversation.");
        }
      }
    }
    
    // If saving completely failed, notify the user
    if (!saveResult.success && saveResult.reachedSizeLimit) {
      console.error("LocalStorage quota exceeded even after pruning. Cannot save reliably.");
      // You might want to show a user-facing alert here
    }
  }, [convos, activeConvoId]); // Re-run whenever convos or the active ID changes

  // Effect to set initial active ID if convos load and no ID is set
  useEffect(() => {
    if (!activeConvoId && convos.length > 0) {
      setActiveConvoId(convos[0].id);
    }
  }, [convos, activeConvoId]);

  /**
   * Creates a new chat conversation
   */
  const handleNewChat = () => {
    const { conversations, newId } = addConversation(convos);
    setConvos(conversations);
    setActiveConvoId(newId);
  };

  /**
   * Deletes a chat conversation
   * 
   * @param {string} idToDelete - ID of conversation to delete
   */
  const handleDeleteChat = (idToDelete) => {
    const { conversations, newActiveId } = deleteConversation(convos, idToDelete, activeConvoId);
    setConvos(conversations);
    
    // Update active ID if the deleted conversation was active
    if (activeConvoId === idToDelete) {
      setActiveConvoId(newActiveId);
    }
  };

  /**
   * Deletes all conversations after confirmation
   */
  const handleDeleteAllChats = () => {
    if (confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
      setConvos([]);
      setActiveConvoId(null);
    }
  };

  /**
   * Updates a conversation title
   * 
   * @param {string} idToEdit - ID of conversation to edit
   * @param {string} newTitle - New title
   */
  const handleEditChatTitle = (idToEdit, newTitle) => {
    setConvos(updateConversationTitle(convos, idToEdit, newTitle));
  };

  /**
   * Toggles the pinned status of a conversation
   * 
   * @param {string} idToPin - ID of conversation to pin/unpin
   */
  const handlePinChat = (idToPin) => {
    setConvos(toggleConversationPin(convos, idToPin));
  };

  return {
    convos,
    setConvos, // Expose setConvos for direct manipulation (e.g., adding messages)
    activeConvoId,
    setActiveConvoId,
    handleNewChat,
    handleDeleteChat,
    handleDeleteAllChats,
    handleEditChatTitle,
    handlePinChat,
  };
} 