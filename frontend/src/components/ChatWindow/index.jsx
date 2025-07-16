import React, { useEffect, useRef, useState } from 'react';
import ImageModal from '../ImageModal';
import UserMessage from './components/UserMessage';
import ModelMessage from './components/ModelMessage';
import { MESSAGE_TYPES } from './constants';
import { loadThemePreference } from '../../hooks/useTheme/theme-utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Main chat window component that displays conversation messages
 * 
 * @param {Object} props - Component props
 * @param {Object} props.convo - Conversation data containing messages
 * @param {string|null} props.streamingModelMessageId - ID of the message being streamed, if any
 * @param {boolean} props.isLoading - Whether a message is currently being processed
 * @param {Function} props.onReloadMessage - Handler for reloading a message
 * @returns {JSX.Element} ChatWindow component
 */
export default function ChatWindow({ convo, streamingModelMessageId, isLoading, onReloadMessage }) {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState(null);
  const [copiedStates, setCopiedStates] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [scrollDirection, setScrollDirection] = useState('down'); // 'up' or 'down'
  const [isScrolling, setIsScrolling] = useState(false);
  
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
      
      // Show scroll button if not at the bottom or top
      setShowScrollButton(!isNearBottom || !isNearTop);
      
      // Determine scroll direction based on position
      if (scrollHeight - scrollTop - clientHeight > 200) {
        setScrollDirection('down');
      } else {
        setScrollDirection('up');
      }

      // Set scrolling state to true
      setIsScrolling(true);
      
      // Clear any existing timeout
      if (window.scrollTimeout) {
        clearTimeout(window.scrollTimeout);
      }
      
      // Set a timeout to hide the button after scrolling stops
      window.scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 1500);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (window.scrollTimeout) {
        clearTimeout(window.scrollTimeout);
      }
    };
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

  // Toggle collapse state for a section
  const toggleCollapse = (sectionId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleCopyMessage = (msgId, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 1500);
    });
  };

  // Handler for reloading/regenerating a message
  const handleReloadMessage = (message) => {
    if (!onReloadMessage || !message) return;
    
    // Find the user message that triggered this model response
    const messageIndex = convo.messages.findIndex(m => m.id === message.id);
    if (messageIndex <= 0) return; // No user message found before this one
    
    // Get the last user message before this model message
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && convo.messages[userMessageIndex].role !== MESSAGE_TYPES.USER) {
      userMessageIndex--;
    }
    
    if (userMessageIndex < 0) return; // No user message found
    
    const userMessage = convo.messages[userMessageIndex];
    if (!userMessage.parts || !userMessage.parts.some(p => p.text)) return;
    
    // Get the text from the user message
    const userText = userMessage.parts
      .filter(p => p.text)
      .map(p => p.text)
      .join(' ');
    
    // Call the onReloadMessage handler with the user text and the model message ID to replace
    onReloadMessage(userText, message.id);
  };

  // Handle running code from a code block
  const handleRunCode = async (code, language, blockId) => {
    try {
      // Create a safe block ID string
      const blockIdStr = blockId || `code-block-${Date.now()}`;
      const safeBlockId = CSS.escape(blockIdStr);
      
      // Find the code block element
      let codeBlock = null;
      
      try {
        codeBlock = document.getElementById(safeBlockId);
        if (!codeBlock && blockIdStr) {
          // Try with CSS.escape for special characters
          codeBlock = document.querySelector(`#${CSS.escape(blockIdStr)}`);
        }
      } catch (selectorError) {
        console.warn('Error with selector, using fallback', selectorError);
      }
      
      // If we still don't have a code block, create one
      if (!codeBlock) {
        console.warn(`Code block with ID ${blockIdStr} not found, creating a container`);
        codeBlock = document.createElement('div');
        codeBlock.id = safeBlockId;
        
        // Find a safe parent to append to
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
          chatMessages.appendChild(codeBlock);
        } else {
          // Fallback to body if .chat-messages doesn't exist
          document.body.appendChild(codeBlock);
        }
      }
      
      const terminalId = `terminal-${safeBlockId}`;
      
      // Create result element if it doesn't exist
      let resultElement = document.querySelector(`#${safeBlockId}-result`);
      if (!resultElement) {
        resultElement = document.createElement('div');
        resultElement.id = `${safeBlockId}-result`;
        resultElement.className = 'code-execution-result';
        
        if (codeBlock.parentNode) {
          codeBlock.parentNode.insertBefore(resultElement, codeBlock.nextSibling);
        } else {
          // Fallback if codeBlock doesn't have a parent
          document.body.appendChild(resultElement);
        }
      }
      
      // Show loading state
      resultElement.innerHTML = `
        <div class="result-header">
          <span>
            <div class="spinner-inline"></div>
            Running code...
          </span>
        </div>
      `;
      
      // Execute the code
      const result = await executeCode(code, language || 'python');
      
      // Clean control characters from the output
      const cleanOutput = result.output.replace(/[\x00-\x1F]/g, '');
      
      // Add terminal-like syntax highlighting
      const highlightedOutput = addTerminalHighlighting(cleanOutput);
      
      // Update the UI with the result
      // Get or create the result element
      resultElement = document.querySelector(`#${safeBlockId}-result`) || resultElement;
      
      // Position the terminal at the bottom-right corner with fixed size
      resultElement.style.position = 'fixed';
      resultElement.style.bottom = '20px';
      resultElement.style.right = '20px';
      resultElement.style.zIndex = '1000';
      resultElement.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
      resultElement.style.width = '550px';
      resultElement.style.maxWidth = '90vw';
      resultElement.style.maxHeight = '60vh';
      resultElement.style.overflow = 'auto';
      resultElement.style.borderRadius = '8px';
      // Theme support will be added via class
      
             // Check if dark mode is active - check both the class and the stored preference for reliability
      const isDarkMode = document.documentElement.classList.contains('dark') || loadThemePreference();
      
              // Set theme-based colors
      const headerBackground = isDarkMode ? 
        'linear-gradient(to right, #2C3E50, #1E2A3A)' : 
        'linear-gradient(to right, #4a6984, #385678)';
      const headerBorderColor = isDarkMode ? '#3a506b' : '#3a5a7a';
      const bodyBackground = isDarkMode ? '#1E1E1E' : '#e9ecef';
      const bodyBorderColor = isDarkMode ? '#333' : '#ced4da';
      const textColor = isDarkMode ? '#f0f0f0' : '#333';
      const iconColor = isDarkMode ? '#64FFDA' : '#28a745';
      const scrollbarColor = isDarkMode ? '#666 #1E1E1E' : '#adb5bd #e9ecef';
      
      // Add theme class to allow dynamic theme changes
      resultElement.className = 'code-execution-result ' + (isDarkMode ? 'dark-theme' : 'light-theme');
      
      // Add a data attribute to mark this as a terminal element that needs theme updates
      resultElement.dataset.terminalElement = 'true';
      
      // Create the output content with enhanced styling and theme support
      resultElement.innerHTML = `
        <div class="result-header terminal-header" style="cursor: move; display: flex; align-items: center; justify-content: space-between; background: ${headerBackground}; color: ${textColor}; border-radius: 8px 8px 0 0; padding: 0.75rem 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.2); border-bottom: 1px solid ${headerBorderColor};">
          <span style="font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: ${iconColor};"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
            Terminal Output
          </span>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button class="close-btn" title="Close" style="background: none; border: none; color: #e74c3c; font-size: 1.5rem; cursor: pointer; line-height: 1; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s;" 
              onmouseover="this.style.backgroundColor='rgba(231, 76, 60, 0.2)'" 
              onmouseout="this.style.backgroundColor='transparent'"
              onclick="this.closest('.code-execution-result').remove()">×</button>
          </div>
        </div>
        <div class="terminal-body" style="background: ${bodyBackground}; border-radius: 0 0 8px 8px; border: 1px solid ${bodyBorderColor}; border-top: none; padding: 0.75rem; font-family: 'Fira Mono', 'Consolas', 'Menlo', monospace; color: ${textColor}; font-size: 0.95rem; max-height: 400px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: ${scrollbarColor};">
          <pre class="result-output" id="${terminalId}-output" style="margin: 0; padding: 0; background: none; border: none; color: inherit; font-family: inherit; font-size: inherit; line-height: 1.4; white-space: pre-wrap; tab-size: 2;">${highlightedOutput.trim()}</pre>
          
          ${result.files && result.files.length > 0 ? `
            <div class="generated-files terminal-files" style="margin-top: ${highlightedOutput.trim().length > 0 ? '0.75rem' : '0'}; border-top: ${highlightedOutput.trim().length > 0 ? `1px solid ${bodyBorderColor}` : 'none'}; padding-top: ${highlightedOutput.trim().length > 0 ? '0.75rem' : '0'};">
              <h4 style="margin: 0 0 0.5rem 0; color: ${isDarkMode ? '#64FFDA' : '#2c7854'}; font-size: 1rem;">Generated Files</h4>
              <ul style="padding: 0; list-style-type: none; margin: 0;">
                ${result.files
                  .filter(file => !file.name.startsWith('mnt') && !file.path.includes('/mnt/'))
                  .map(file => {
                    // Check if it's an image file
                    const isImage = /\.(jpg|jpeg|png|gif|svg|bmp|webp)$/i.test(file.name);
                    return `
                      <li style="margin-bottom: 0.5rem; display: flex; align-items: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; color: ${isDarkMode ? '#64B5F6' : '#0d6efd'};">
                          ${isImage ? 
                            `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>` : 
                            `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>`
                          }
                        </svg>
                        <a href="${file.downloadUrl}" download="${file.name}" style="color: ${isDarkMode ? '#64B5F6' : '#0d6efd'}; text-decoration: none; font-weight: 500; transition: color 0.2s;" onmouseover="this.style.color='${isDarkMode ? '#90CAF9' : '#0a58ca'}'" onmouseout="this.style.color='${isDarkMode ? '#64B5F6' : '#0d6efd'}'">${file.name}</a>
                        ${isImage ? `
                          <button 
                            onclick="(function(){
                              var containerId = 'img-container-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}';
                              var container = document.getElementById(containerId);
                              var button = this;
                              
                              // Toggle visibility
                              if (container) {
                                if (container.style.display === 'none') {
                                  container.style.display = 'block';
                                  button.innerHTML = '<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'14\\' height=\\'14\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' style=\\'margin-right: 4px;\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\'></circle><line x1=\\'8\\' y1=\\'12\\' x2=\\'16\\' y2=\\'12\\'></line></svg>- Hide';
                                } else {
                                  container.style.display = 'none';
                                  button.innerHTML = '<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'14\\' height=\\'14\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' style=\\'margin-right: 4px;\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\'></circle><line x1=\\'12\\' y1=\\'8\\' x2=\\'12\\' y2=\\'16\\'></line><line x1=\\'8\\' y1=\\'12\\' x2=\\'16\\' y2=\\'12\\'></line></svg>+ Show';
                                }
                              } else {
                                // Create new image container
                                var img = document.createElement('img');
                                img.src = '${file.downloadUrl}';
                                img.style.maxWidth = '100%';
                                img.style.display = 'block';
                                img.style.margin = '8px 0';
                                img.style.borderRadius = '4px';
                                img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                                
                                container = document.createElement('div');
                                container.id = containerId;
                                container.style.marginTop = '8px';
                                container.appendChild(img);
                                document.getElementById('${terminalId}-output').parentNode.appendChild(container);
                                
                                // Change button text to Hide
                                button.innerHTML = '<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'14\\' height=\\'14\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' style=\\'margin-right: 4px;\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\'></circle><line x1=\\'8\\' y1=\\'12\\' x2=\\'16\\' y2=\\'12\\'></line></svg>- Hide';
                              }
                            })()"
                            style="background: none; border: none; color: ${isDarkMode ? '#64FFDA' : '#198754'}; margin-left: 8px; cursor: pointer; font-size: 0.85rem; display: inline-flex; align-items: center;"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                            + Show
                          </button>
                        ` : ''}
                  </li>
                    `;
                  }).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;

      // Make the terminal draggable
      makeDraggable(resultElement);
    } catch (error) {
      console.error('Error executing code:', error);
      
      // Create a standalone error display
      const errorContainer = document.createElement('div');
      errorContainer.className = 'code-execution-result error';
      errorContainer.style.position = 'fixed';
      errorContainer.style.top = '50%';
      errorContainer.style.left = '50%';
      errorContainer.style.transform = 'translate(-50%, -50%)';
      errorContainer.style.zIndex = '1000';
      
      errorContainer.innerHTML = `
        <div class="result-header">
          <span class="error-text">Error</span>
          <button onclick="this.parentNode.parentNode.remove()">×</button>
        </div>
        <pre class="result-output error">${error.message || 'Failed to execute code'}</pre>
      `;
      
      document.body.appendChild(errorContainer);
      makeDraggable(errorContainer);
    }
  };
  
  // Helper function to add terminal-like syntax highlighting
  const addTerminalHighlighting = (output) => {
    if (!output) return '';
    
    // Preprocess the output to handle any broken HTML or span tags that might be showing
    let cleanOutput = output
      // Clean up any <span> or </span> that might be showing in the output
      .replace(/<\/?span[^>]*>/g, '')
      // Clean up any visible HTML tags
      .replace(/&lt;\/?\w+&gt;/g, '')
      // Remove any visible HTML entities
      .replace(/&[^;]+;/g, match => {
        // Keep legitimate whitespace and line breaks
        if (match === '&nbsp;' || match === '&#10;') return match;
        return ' ';
      });
    
    // First, escape any HTML entities to prevent raw HTML from being rendered
    const escapeHtml = (text) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };
    
    const escapedOutput = escapeHtml(cleanOutput);
    
    return escapedOutput
      // Success messages
      .replace(/Success|Completed|Done|OK|[0-9]+\/[0-9]+|saved successfully|generated successfully/gi, '<span style="color: #4CAF50; font-weight: 500;">$&</span>')
      // Error messages
      .replace(/Error|Failed|Exception|Warning|stderr:|Traceback \(most recent call last\):|SyntaxError|ValueError|TypeError|NameError|ImportError|RuntimeError|FileNotFoundError/gi, '<span style="color: #FF5252; font-weight: 500;">$&</span>')
      // Brackets and their contents
      .replace(/\[([^\]]+)\]/g, '[<span style="color: #FFD700;">$1</span>]')
      // Path highlighting
      .replace(/(\/[\w\/\.-]+)/g, '<span style="color: #64B5F6;">$&</span>')
      // Command prompts
      .replace(/(^|\n)(\$|>|#) /g, '$1<span style="color: #64FFDA;">$2</span> ')
      // Numbers
      .replace(/\b(\d+(\.\d+)?)\b/g, '<span style="color: #FF9800;">$&</span>')
      // Line alignment and spacing
      .replace(/\n/g, '\n  ')
      // Timestamps or datetime patterns
      .replace(/\b\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}\b/g, '<span style="color: #9C27B0;">$&</span>');
  };

  // Helper function to make an element draggable
  function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = element.querySelector('.result-header');
    
    if (header) {
      header.onmousedown = dragMouseDown;
    }
    
    function dragMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      element.style.position = 'fixed';
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
      element.style.zIndex = "1000";
    }
    
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  // Execute code through the backend API
  const executeCode = async (code, language) => {
    try {
      const response = await fetch('http://localhost:9000/tools/codeexecution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          language
        })
      });
      
      if (!response.ok) {
        // Try to parse error as JSON, but handle HTML responses too
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to execute code');
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }
      
      const result = await response.json();
      console.log('Code execution result:', result);
    
    // If it's a .py file being requested, save it
    if (language === 'python' && code.includes('#!/usr/bin/env python') || code.includes('# -*- coding:')) {
      // Try to extract filename from code comments or save with default name
      const filenameMatch = code.match(/# *filename *: *([^\n]+\.py)/i) || 
                          code.match(/# *save +as *: *([^\n]+\.py)/i);
      const filename = filenameMatch ? filenameMatch[1].trim() : 'script.py';
      
      // Save python file to /mnt/data directory - added to result.files automatically
      await fetch('http://localhost:9000/tools/codeexecution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: `
import os
with open("/code/${filename}", "w") as f:
    f.write(${JSON.stringify(code)})
print(f"Saved {filename} successfully")
`,
          language: 'python'
        })
      });
      console.log(`Attempted to save Python file: ${filename}`);
    }
      
      return {
        output: result.output || 'No output',
        outcome: result.success ? 'OUTCOME_OK' : 'OUTCOME_ERROR',
        files: result.files || []
      };
    } catch (error) {
      console.error('Error executing code:', error);
      throw error;
    }
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

  // Determine button visibility class based on scroll state
  const buttonVisibilityClass = isScrolling ? 'opacity-90' : 'opacity-0';
  // Determine button style based on theme (assuming a dark theme check)
  const isDarkTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const buttonThemeClass = isDarkTheme ? 
    'bg-gray-800 text-gray-200 hover:bg-gray-700' : 
    'bg-gray-200 text-gray-800 hover:bg-gray-300';

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
              handleReloadMessage={onReloadMessage ? handleReloadMessage : null}
              handleRunCode={handleRunCode}
            />
          );
        }
      })}
      
      <div ref={messagesEndRef} />
      <ImageModal isOpen={modalOpen} onClose={closeModal} imageData={selectedImageData} />
      
      {/* Scroll button - positioned on middle-right side of screen with fade effect */}
      {showScrollButton && (
        <button
          onClick={handleScroll}
          className={`fixed right-4 sm:right-8 top-2/3 transform -translate-y-1/2 z-10 p-2 rounded-full shadow-md transition-all duration-300 ${buttonVisibilityClass} ${buttonThemeClass}`}
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