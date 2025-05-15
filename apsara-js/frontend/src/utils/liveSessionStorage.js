/**
 * Utility functions for managing live chat sessions in localStorage
 */

const STORAGE_KEY = 'apsara_live_sessions';

/**
 * Save a session to localStorage
 * @param {Object} sessionData - The session data to save
 * @returns {boolean} - Whether the save was successful
 */
export const saveSession = (sessionData) => {
  try {
    // Get existing sessions
    const existingSessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    
    // Check if session with this resume handle already exists
    const existingIndex = existingSessions.findIndex(
      session => session.resumeHandle === sessionData.resumeHandle
    );
    
    if (existingIndex >= 0) {
      // Update existing session
      existingSessions[existingIndex] = {
        ...existingSessions[existingIndex],
        ...sessionData,
        timestamp: Date.now() // Update timestamp
      };
    } else {
      // Add new session
      existingSessions.push(sessionData);
    }
    
    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingSessions));
    return true;
  } catch (error) {
    console.error('Error saving session to localStorage:', error);
    return false;
  }
};

/**
 * Load sessions from localStorage
 * @returns {Array} - Array of saved sessions
 */
export const loadSessions = () => {
  try {
    const sessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    // Sort by timestamp descending (newest first)
    return sessions.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error loading sessions from localStorage:', error);
    return [];
  }
};

/**
 * Delete a session from localStorage
 * @param {string} sessionId - The ID of the session to delete
 * @returns {boolean} - Whether the deletion was successful
 */
export const deleteSession = (sessionId) => {
  try {
    const existingSessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const filteredSessions = existingSessions.filter(session => session.id !== sessionId);
    
    if (filteredSessions.length === existingSessions.length) {
      return false; // No session was deleted
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSessions));
    return true;
  } catch (error) {
    console.error('Error deleting session from localStorage:', error);
    return false;
  }
};

/**
 * Update a session property in localStorage
 * @param {string} sessionId - The ID of the session to update
 * @param {string} key - The property to update
 * @param {any} value - The new value
 * @returns {boolean} - Whether the update was successful
 */
export const updateSessionProp = (sessionId, key, value) => {
  try {
    const existingSessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const sessionIndex = existingSessions.findIndex(session => session.id === sessionId);
    
    if (sessionIndex === -1) {
      return false; // Session not found
    }
    
    existingSessions[sessionIndex] = {
      ...existingSessions[sessionIndex],
      [key]: value,
      timestamp: Date.now() // Update timestamp
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingSessions));
    return true;
  } catch (error) {
    console.error('Error updating session in localStorage:', error);
    return false;
  }
};

/**
 * Get the most recent session handle
 * @returns {string|null} - The most recent session's resumeHandle or null if none exists
 */
export const getMostRecentSessionHandle = () => {
  try {
    const sessions = loadSessions();
    if (sessions.length === 0) return null;
    
    return sessions[0].resumeHandle || null;
  } catch (error) {
    console.error('Error getting most recent session handle:', error);
    return null;
  }
};

/**
 * Update or create a session with the given resume handle
 * @param {string} resumeHandle - The session resume handle
 * @param {Object} sessionData - Additional session data
 * @returns {boolean} - Whether the update was successful
 */
export const updateSessionWithHandle = (resumeHandle, sessionData = {}) => {
  try {
    if (!resumeHandle) return false;
    
    const existingSessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const sessionIndex = existingSessions.findIndex(
      session => session.resumeHandle === resumeHandle
    );
    
    const newSessionData = {
      resumeHandle,
      timestamp: Date.now(),
      ...sessionData
    };
    
    if (sessionIndex >= 0) {
      // Update existing session
      existingSessions[sessionIndex] = {
        ...existingSessions[sessionIndex],
        ...newSessionData
      };
    } else {
      // Create new session entry with generated ID
      // Use a more descriptive format for auto-saved sessions
      const date = new Date();
      const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const formattedDate = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      existingSessions.push({
        id: Date.now().toString(),
        title: `Auto-saved Session (${formattedDate}, ${formattedTime})`,
        messageCount: 0, // Initialize message count
        ...newSessionData
      });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingSessions));
    return true;
  } catch (error) {
    console.error('Error updating session with handle:', error);
    return false;
  }
};

// Get all saved sessions
export const getSavedSessions = () => {
  try {
    const sessionsData = localStorage.getItem(STORAGE_KEY);
    if (!sessionsData) return [];
    return JSON.parse(sessionsData);
  } catch (error) {
    console.error('Error loading saved sessions:', error);
    return [];
  }
};

// Get a specific session by ID
export const getSessionById = (sessionId) => {
  try {
    const existingSessions = getSavedSessions();
    return existingSessions.find(s => s.id === sessionId) || null;
  } catch (error) {
    console.error('Error getting session by ID:', error);
    return null;
  }
};

/**
 * Save a session before disconnection
 * @param {string} resumeHandle - The session resume handle
 * @param {Object} sessionData - Additional session data
 * @returns {boolean} - Whether the save was successful
 */
export const saveDisconnectedSession = (resumeHandle, sessionData = {}) => {
  try {
    if (!resumeHandle) return false;
    
    const existingSessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    
    // Create a timestamp for the session name
    const date = new Date();
    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    // Create new session entry with special disconnection title
    existingSessions.push({
      id: Date.now().toString(),
      title: `SESSION DISCONNECTED: ${formattedDate}, ${formattedTime}`,
      messageCount: sessionData.messageCount || 0,
      resumeHandle,
      timestamp: Date.now(),
      sessionType: 'disconnected', // Tag this session as a disconnected session
      ...sessionData
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingSessions));
    return true;
  } catch (error) {
    console.error('Error saving disconnected session:', error);
    return false;
  }
};

// Delete all sessions
export const clearAllSessions = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error deleting all sessions:', error);
    return false;
  }
};

// For backwards compatibility, also export as deleteAllSessions
export const deleteAllSessions = clearAllSessions;

// Export session as a JSON file
export const exportSession = (sessionId) => {
  try {
    const session = getSessionById(sessionId);
    if (!session) return false;
    
    // Create a JSON file
    const sessionJSON = JSON.stringify(session, null, 2);
    const blob = new Blob([sessionJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a link and click it to download the file
    const a = document.createElement('a');
    a.href = url;
    a.download = `apsara_session_${session.id}.json`;
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error exporting session:', error);
    return false;
  }
};

// Import session from a JSON file
export const importSession = async (file) => {
  try {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const sessionData = JSON.parse(event.target.result);
          
          // Validate the session data has required fields
          if (!sessionData.id || !sessionData.resumeHandle) {
            reject(new Error('Invalid session data'));
            return;
          }
          
          // Save the imported session
          const success = saveSession(sessionData);
          resolve(success ? sessionData : null);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsText(file);
    });
  } catch (error) {
    console.error('Error importing session:', error);
    return null;
  }
}; 