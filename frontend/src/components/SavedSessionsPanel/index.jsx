import React, { useState, useEffect } from 'react';
import { BookOpen, Trash } from 'lucide-react';
import SessionItem from './components/SessionItem';
import EmptyState from './components/EmptyState';
import {
  STORAGE_KEY,
  MAX_SESSIONS,
  MAX_TITLE_LENGTH,
  PANEL_CLASS,
  HEADER_CLASS,
  LIST_CLASS,
  BUTTON_CLASS,
  DELETE_BUTTON_CLASS,
  PANEL_TITLE,
  SAVE_BUTTON_TEXT,
  CLEAR_BUTTON_TEXT,
  CONFIRM_CLEAR_MESSAGE,
  DEFAULT_SESSION_TITLE
} from './constants';

/**
 * Panel for managing saved conversation sessions
 * 
 * @param {Object} props - Component props
 * @param {Array} props.currentMessages - Current conversation messages
 * @param {Function} props.onLoadSession - Handler for loading a saved session
 * @returns {JSX.Element} SavedSessionsPanel component
 */
export default function SavedSessionsPanel({ currentMessages, onLoadSession }) {
  const [savedSessions, setSavedSessions] = useState([]);

  // Load saved sessions from localStorage on component mount
  useEffect(() => {
    const loadSavedSessions = () => {
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          if (Array.isArray(parsedData)) {
            setSavedSessions(parsedData);
          }
        }
      } catch (error) {
        console.error('Error loading saved sessions:', error);
      }
    };

    loadSavedSessions();
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSessions));
    } catch (error) {
      console.error('Error saving sessions to localStorage:', error);
    }
  }, [savedSessions]);

  // Generate a title for the current conversation
  const generateSessionTitle = () => {
    if (!currentMessages || currentMessages.length === 0) {
      return DEFAULT_SESSION_TITLE;
    }

    // Find the first user message to use as title
    const firstUserMessage = currentMessages.find(msg => msg.role === 'user');
    
    if (firstUserMessage && firstUserMessage.content) {
      // Extract the first line or sentence
      let title = firstUserMessage.content.split('\n')[0].trim();
      
      // Truncate if too long
      if (title.length > MAX_TITLE_LENGTH) {
        title = title.substring(0, MAX_TITLE_LENGTH) + '...';
      }
      
      return title || DEFAULT_SESSION_TITLE;
    }
    
    return DEFAULT_SESSION_TITLE;
  };

  // Save the current conversation
  const handleSaveSession = () => {
    if (!currentMessages || currentMessages.length === 0) {
      return;
    }

    const newSession = {
      id: Date.now().toString(),
      title: generateSessionTitle(),
      messages: [...currentMessages],
      timestamp: Date.now()
    };

    // Add new session and limit to MAX_SESSIONS
    setSavedSessions(prev => [newSession, ...prev].slice(0, MAX_SESSIONS));
  };

  // Load a saved session
  const handleLoadSession = (session) => {
    if (onLoadSession) {
      onLoadSession(session.messages);
    }
  };

  // Delete a specific session
  const handleDeleteSession = (sessionId) => {
    setSavedSessions(prev => prev.filter(session => session.id !== sessionId));
  };

  // Clear all saved sessions
  const handleClearAll = () => {
    if (window.confirm(CONFIRM_CLEAR_MESSAGE)) {
      setSavedSessions([]);
    }
  };

  return (
    <div className={PANEL_CLASS}>
      <div className={HEADER_CLASS}>
        <h3 className="font-medium flex items-center">
          <BookOpen className="w-4 h-4 mr-2" />
          {PANEL_TITLE}
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={handleSaveSession}
            className={BUTTON_CLASS}
            disabled={!currentMessages || currentMessages.length === 0}
          >
            {SAVE_BUTTON_TEXT}
          </button>
          {savedSessions.length > 0 && (
            <button
              onClick={handleClearAll}
              className={DELETE_BUTTON_CLASS}
              title="Delete all saved sessions"
            >
              <Trash className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className={LIST_CLASS}>
        {savedSessions.length === 0 ? (
          <EmptyState />
        ) : (
          savedSessions.map(session => (
            <SessionItem
              key={session.id}
              session={session}
              onClick={handleLoadSession}
              onDelete={handleDeleteSession}
            />
          ))
        )}
      </div>
    </div>
  );
} 