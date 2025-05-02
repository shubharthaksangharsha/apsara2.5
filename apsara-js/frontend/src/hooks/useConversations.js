import { useState, useEffect, useCallback } from 'react';

const MAX_LOCALSTORAGE_SIZE_MB = 4.5;
const BYTES_PER_MB = 1024 * 1024;
const MAX_STORAGE_BYTES = MAX_LOCALSTORAGE_SIZE_MB * BYTES_PER_MB;

export function useConversations() {
  const [convos, setConvos] = useState(() => {
    try {
      const storedConvos = localStorage.getItem('conversations');
      return storedConvos ? JSON.parse(storedConvos) : [];
    } catch (e) {
      console.error("Error parsing conversations from localStorage:", e);
      localStorage.removeItem('conversations'); // Clear potentially corrupted data
      return [];
    }
  });

  const [activeConvoId, setActiveConvoId] = useState(() =>
    convos.length > 0 ? convos[0].id : null
  );

  // Effect to save conversations and handle pruning
  useEffect(() => {
    try {
      let convosToSave = [...convos]; // Create a mutable copy
      let convosString = JSON.stringify(convosToSave);
      let currentSize = new Blob([convosString]).size;

      // Prune oldest conversations if size exceeds limit
      while (currentSize > MAX_STORAGE_BYTES && convosToSave.length > 1) {
        const removedConvo = convosToSave.pop(); // Remove the oldest
        console.warn(`Quota exceeded: Removing oldest conversation ('${removedConvo?.title || removedConvo?.id}') to free space.`);
        convosString = JSON.stringify(convosToSave);
        currentSize = new Blob([convosString]).size;

        // If the active conversation was pruned, update activeConvoId
        if (activeConvoId === removedConvo?.id) {
           // Avoid infinite loop by setting state outside the loop if needed
           // For simplicity, just log here. App might need to react.
           console.warn("Active conversation was pruned due to storage limits.");
           // Optionally, update activeId outside the loop or trigger a re-render
           // setActiveConvoId(convosToSave.length > 0 ? convosToSave[0].id : null);
           // alert("The oldest conversation (which was active) was removed to free up storage space.");
        }
      }

       // Final check if pruning didn't help enough or only one convo exists
       if (currentSize > MAX_STORAGE_BYTES && convosToSave.length <= 1) {
          console.error("LocalStorage quota exceeded even after pruning. Cannot save reliably.");
          alert("Warning: Could not save conversation changes. Storage limit reached.");
          return; // Avoid saving if it's guaranteed to fail
       }

      localStorage.setItem('conversations', convosString);

      // If pruning removed the active convo, update the state *after* saving
      // This check needs to happen outside the loop to prevent potential state update loops
      if (!convosToSave.some(c => c.id === activeConvoId) && activeConvoId !== null) {
          const newActiveId = convosToSave.length > 0 ? convosToSave[0].id : null;
          setActiveConvoId(newActiveId);
          if (newActiveId !== activeConvoId) { // Check if ID actually changed
              alert("The active conversation was removed due to storage limits. Switched to the newest conversation.");
          }
      }


    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error("LocalStorage quota exceeded on save:", e);
        alert("Error: Could not save conversation changes. Browser storage limit reached.");
      } else {
        console.error("Error saving conversations to localStorage:", e);
      }
    }
  }, [convos, activeConvoId]); // Re-run whenever convos or the active ID changes

  // Effect to set initial active ID if convos load and no ID is set
  useEffect(() => {
     if (!activeConvoId && convos.length > 0) {
         setActiveConvoId(convos[0].id);
     }
  }, [convos, activeConvoId]);


  const handleNewChat = useCallback(() => {
    const id = Date.now().toString();
    const newChat = { id, title: 'New Chat', messages: [] };
    setConvos(prevConvos => [newChat, ...prevConvos]); // Prepend new chat
    setActiveConvoId(id);
  }, []); // No dependencies needed if it only uses Date.now()

  const handleDeleteChat = useCallback((idToDelete) => {
     setConvos(prevConvos => {
         const updatedConvos = prevConvos.filter(convo => convo.id !== idToDelete);
         // If the deleted chat was active, select the next one
         if (activeConvoId === idToDelete) {
             const currentIndex = prevConvos.findIndex(convo => convo.id === idToDelete);
             const nextIndex = currentIndex > 0 ? currentIndex - 1 : (updatedConvos.length > 0 ? 0 : -1);
             const newActiveId = nextIndex !== -1 ? updatedConvos[nextIndex]?.id : null;
             setActiveConvoId(newActiveId); // Update active ID state
         }
         return updatedConvos;
     });
  }, [activeConvoId]); // Depends on activeConvoId to correctly switch after delete

  const handleDeleteAllChats = useCallback(() => {
    if (confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
      setConvos([]);
      setActiveConvoId(null);
    }
  }, []); // No dependencies

  return {
    convos,
    setConvos, // Expose setConvos for direct manipulation (e.g., adding messages)
    activeConvoId,
    setActiveConvoId,
    handleNewChat,
    handleDeleteChat,
    handleDeleteAllChats,
  };
}