/**
 * Utilities for conversation storage management
 */

import { MAX_STORAGE_BYTES, LS_KEY_CONVERSATIONS } from './constants';

/**
 * Load conversations from localStorage
 * 
 * @returns {Array} Array of conversations, or empty array if none found or error
 */
export const loadConversations = () => {
  try {
    const storedConvos = localStorage.getItem(LS_KEY_CONVERSATIONS);
    return storedConvos ? JSON.parse(storedConvos) : [];
  } catch (e) {
    console.error("Error parsing conversations from localStorage:", e);
    localStorage.removeItem(LS_KEY_CONVERSATIONS); // Clear potentially corrupted data
    return [];
  }
};

/**
 * Clean file attachments from conversations for storage
 * 
 * @param {Array} conversations - Conversations array
 * @returns {Array} - Cleaned conversations array
 */
export const cleanFileAttachments = (conversations) => {
  // Deep clone and remove file attachments before saving
  let convosToSave = JSON.parse(JSON.stringify(conversations));
  
  // Remove file attachments from all messages in all conversations
  convosToSave.forEach(convo => {
    if (convo.messages) {
      convo.messages.forEach(msg => {
        // Clean file data from message parts
        if (msg.parts) {
          msg.parts = msg.parts.map(part => {
            // If the part has fileData, create a clean version without it
            if (part.fileData) {
              // Keep just minimal reference data if needed for UI
              return {
                ...part,
                fileData: {
                  mimeType: part.fileData.mimeType,
                  fileName: part.fileData.fileName,
                  // Don't store actual file data/URIs
                }
              };
            }
            return part;
          });
        }
      });
    }
  });
  
  return convosToSave;
};

/**
 * Save conversations to localStorage, pruning if necessary
 * 
 * @param {Array} convos - Conversations to save
 * @param {string|null} activeConvoId - Active conversation ID
 * @returns {Object} - Result with pruned flag and any removed ID
 */
export const saveConversations = (convos, activeConvoId = null) => {
  try {
    let convosToSave = cleanFileAttachments(convos);
    let convosString = JSON.stringify(convosToSave);
    let currentSize = new Blob([convosString]).size;
    let prunedIds = [];
    let reachedSizeLimit = false;

    // Prune oldest conversations if size exceeds limit
    while (currentSize > MAX_STORAGE_BYTES && convosToSave.length > 1) {
      const removedConvo = convosToSave.pop(); // Remove the oldest
      prunedIds.push(removedConvo?.id);
      console.warn(`Quota exceeded: Removing oldest conversation ('${removedConvo?.title || removedConvo?.id}') to free space.`);
      convosString = JSON.stringify(convosToSave);
      currentSize = new Blob([convosString]).size;
    }

    // Final check if pruning didn't help enough or only one convo exists
    if (currentSize > MAX_STORAGE_BYTES && convosToSave.length <= 1) {
      console.error("LocalStorage quota exceeded even after pruning. Cannot save reliably.");
      reachedSizeLimit = true;
      return { 
        success: false, 
        pruned: prunedIds.length > 0, 
        prunedIds, 
        reachedSizeLimit, 
        activeIdPruned: prunedIds.includes(activeConvoId)
      };
    }

    localStorage.setItem(LS_KEY_CONVERSATIONS, convosString);
    
    return { 
      success: true, 
      pruned: prunedIds.length > 0, 
      prunedIds, 
      reachedSizeLimit, 
      activeIdPruned: prunedIds.includes(activeConvoId)
    };
  } catch (e) {
    console.error("Error saving conversations to localStorage:", e);
    return { 
      success: false, 
      pruned: false, 
      prunedIds: [], 
      reachedSizeLimit: e.name === 'QuotaExceededError', 
      activeIdPruned: false
    };
  }
}; 