/**
 * Utilities for conversation management operations
 */

import { DEFAULT_TITLE } from './constants';

/**
 * Creates a new conversation
 * 
 * @returns {Object} New conversation object
 */
export const createNewConversation = () => {
  const id = Date.now().toString();
  return { 
    id, 
    title: DEFAULT_TITLE, 
    messages: [] 
  };
};

/**
 * Adds a new conversation to the list
 * 
 * @param {Array} conversations - Current conversations list
 * @returns {Object} - Object with updated conversation list and ID of new conversation
 */
export const addConversation = (conversations = []) => {
  const newChat = createNewConversation();
  const pinned = conversations.filter(c => c.pinned);
  const unpinned = conversations.filter(c => !c.pinned);
  
  // New chats are added after pinned but before unpinned
  const updatedConvos = [...pinned, newChat, ...unpinned];
  
  return {
    conversations: updatedConvos,
    newId: newChat.id
  };
};

/**
 * Deletes a conversation from the list
 * 
 * @param {Array} conversations - Current conversations list
 * @param {string} idToDelete - ID of conversation to delete
 * @param {string} activeId - Currently active conversation ID
 * @returns {Object} - Object with updated list and potentially new active ID
 */
export const deleteConversation = (conversations = [], idToDelete, activeId = null) => {
  const updatedConvos = conversations.filter(convo => convo.id !== idToDelete);
  let newActiveId = activeId;
  
  // If the deleted chat was active, select the next one
  if (activeId === idToDelete) {
    const currentIndex = conversations.findIndex(convo => convo.id === idToDelete);
    const nextIndex = currentIndex > 0 ? currentIndex - 1 : (updatedConvos.length > 0 ? 0 : -1);
    newActiveId = nextIndex !== -1 ? updatedConvos[nextIndex]?.id : null;
  }

  return {
    conversations: updatedConvos,
    newActiveId
  };
};

/**
 * Updates conversation title
 * 
 * @param {Array} conversations - Current conversations list
 * @param {string} idToEdit - ID of conversation to edit
 * @param {string} newTitle - New title
 * @returns {Array} - Updated conversations list
 */
export const updateConversationTitle = (conversations = [], idToEdit, newTitle) => {
  return conversations.map(convo =>
    convo.id === idToEdit ? { ...convo, title: newTitle } : convo
  );
};

/**
 * Toggles pin status of a conversation
 * 
 * @param {Array} conversations - Current conversations list
 * @param {string} idToToggle - ID of conversation to toggle
 * @returns {Array} - Updated conversations list
 */
export const toggleConversationPin = (conversations = [], idToToggle) => {
  const updatedConvos = conversations.map(convo =>
    convo.id === idToToggle ? { ...convo, pinned: !convo.pinned } : convo
  );
  
  // Move pinned convos to the top
  return [
    ...updatedConvos.filter(c => c.pinned),
    ...updatedConvos.filter(c => !c.pinned)
  ];
}; 