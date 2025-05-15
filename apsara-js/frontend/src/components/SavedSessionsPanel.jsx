import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MessageSquare, Trash2, Volume2, AudioLines, MessageSquareText } from 'lucide-react';
import { loadSessions, deleteSession, clearAllSessions } from '../utils/liveSessionStorage';

/**
 * Component to display and manage saved live sessions
 */
export default function SavedSessionsPanel({ onClose, onSelectSession }) {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  useEffect(() => {
    loadSavedSessions();
  }, []);

  const loadSavedSessions = () => {
    setIsLoading(true);
    try {
      const savedSessions = loadSessions();
      setSessions(savedSessions);
    } catch (error) {
      console.error("Error loading saved sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = (sessionId) => {
    if (deleteConfirmId === sessionId) {
      deleteSession(sessionId);
      setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(sessionId);
      // Auto-reset confirmation after 3 seconds
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handleDeleteAllSessions = () => {
    if (showDeleteAllConfirm) {
      // User confirmed, delete all sessions
      clearAllSessions();
      setSessions([]);
      setShowDeleteAllConfirm(false);
    } else {
      // First click, show confirmation
      setShowDeleteAllConfirm(true);
      // Auto-reset confirmation after 3 seconds
      setTimeout(() => setShowDeleteAllConfirm(false), 3000);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    return new Date(timestamp).toLocaleString();
  };

  // Helper to get appropriate icon for session type
  const getModalityIcon = (modality) => {
    switch (modality) {
      case 'AUDIO':
        return <Volume2 className="w-3.5 h-3.5 text-blue-500" />;
      case 'AUDIO_TEXT':
        return <AudioLines className="w-3.5 h-3.5 text-purple-500" />;
      case 'TEXT':
        return <MessageSquareText className="w-3.5 h-3.5 text-green-500" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-60 flex justify-center items-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '85vh' }}
      >
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-500" />
            Saved Sessions
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-grow custom-scrollbar pr-1">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No saved sessions found</p>
              <p className="text-xs mt-1">Start a new session and click "Save" to save it for later.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {sessions.map(session => (
                <li 
                  key={session.id} 
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:shadow-md transition-shadow relative group"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full">
                      {getModalityIcon(session.modality)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 
                          className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate mr-8 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400" 
                          onClick={() => onSelectSession(session)}
                        >
                          {session.title || "Untitled Session"}
                        </h4>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className={`p-1 rounded ${deleteConfirmId === session.id ? 'bg-red-100 dark:bg-red-900/50 text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400'}`}
                          title={deleteConfirmId === session.id ? "Click again to confirm" : "Delete session"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 gap-y-1 sm:gap-y-0 sm:gap-x-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 inline opacity-70" />
                          <span>{formatDate(session.timestamp)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 inline opacity-70" />
                          <span>{session.messageCount || 0} messages</span>
                        </div>
                        {session.voice && (
                          <div className="hidden sm:flex items-center gap-1">
                            <Volume2 className="w-3 h-3 inline opacity-70" />
                            <span>{session.voice}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onSelectSession(session)}
                    className="mt-2 sm:mt-3 w-full py-1.5 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                  >
                    Resume Session
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {sessions.length > 0 && (
            <button
              onClick={handleDeleteAllSessions}
              className={`w-full px-4 py-2 ${showDeleteAllConfirm ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white text-sm font-medium rounded-lg transition-colors`}
            >
              {showDeleteAllConfirm ? 'Confirm Delete All Sessions' : 'Delete All Sessions'}
            </button>
          )}
          
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 