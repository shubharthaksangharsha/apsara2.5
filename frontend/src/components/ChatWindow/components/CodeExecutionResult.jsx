import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Loader, Terminal, Download, X, Maximize, Minimize } from 'lucide-react';

/**
 * Enhanced terminal-style code execution result component
 * 
 * @param {Object} props - Component props
 * @param {string} props.resultOutput - The output text to display
 * @param {string} props.uniqueId - Unique identifier for this result block
 * @param {boolean} props.isCollapsed - Whether the result is collapsed
 * @param {Function} props.toggleCollapse - Handler for toggling collapse state
 * @param {Array} props.files - Generated files for download
 * @returns {JSX.Element} CodeExecutionResult component
 */
const CodeExecutionResult = ({ 
  resultOutput, 
  uniqueId, 
  isCollapsed, 
  toggleCollapse,
  files = []
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const contentRef = useRef(null);
  
  // Clean up control characters from output
  const cleanOutput = resultOutput.replace(/[\x00-\x1F]/g, '');

  // Add syntax highlighting for common terminal patterns
  const formatTerminalOutput = (output) => {
    if (!output) return '';
    
    // Basic formatting for common terminal patterns
    return output
      .replace(/Success|Completed|Done|OK|[0-9]+\/[0-9]+/gi, '<span class="green">$&</span>')
      .replace(/Error|Failed|Exception|Warning|stderr:/gi, '<span class="red">$&</span>')
      .replace(/\[([^\]]+)\]/g, '[<span class="yellow">$1</span>]')
      .replace(/(^|\n)(\$|>|#) /g, '$1<span class="blue">$2</span> ');
  };

  // Handle dragging for floating terminal
  const handleMouseDown = (e) => {
    if (dragRef.current && dragRef.current.contains(e.target)) {
      setIsDragging(true);
      setStartPos({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (isMinimized) setIsMinimized(false);
  };

  // Set up and clean up event listeners for dragging
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startPos]);

  // Generate unique IDs for terminal elements
  const terminalId = `terminal-${uniqueId}`;

  // Handle auto-scroll to bottom of terminal
  useEffect(() => {
    if (contentRef.current && !isCollapsed) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [resultOutput, isCollapsed]);
  
  // Determine terminal size and position based on state
  const terminalStyle = isFullscreen 
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        height: '80%',
        maxWidth: '1200px',
        maxHeight: '800px',
        zIndex: 1000,
        borderRadius: '8px',
      }
    : {
        position: 'fixed',
        width: isMinimized ? '300px' : '80%',
        maxWidth: '800px',
        transform: `translate(${position.x}px, ${position.y}px)`,
        zIndex: 100,
        borderRadius: '8px',
        maxHeight: isMinimized ? '40px' : '500px',
      };
  
  return (
    <div 
      className="code-execution-result"
      style={terminalStyle}
    >
      {/* Terminal header with controls */}
      <div 
        className="result-header"
        ref={dragRef} 
        onMouseDown={handleMouseDown}
        style={{ cursor: 'move' }}
      >
        <span className="font-semibold">
          <Terminal size={16} className="inline-block mr-2" />
          Terminal Output
        </span>
        <div className="flex items-center gap-2">
          {files && files.length > 0 && (
            <button 
              className="p-1 text-green-300 hover:text-green-100 transition"
              title="Generated Files"
            >
              <Download size={16} />
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-1 text-gray-300 hover:text-white transition"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-300 hover:text-white transition"
            title={isMinimized ? "Expand Terminal" : "Minimize Terminal"}
          >
            {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={() => toggleCollapse(uniqueId)}
            className="p-1 text-gray-300 hover:text-white transition"
            title="Close Terminal"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Terminal content area */}
      {!isCollapsed && !isMinimized && (
        <div className="terminal-body" style={{ height: isFullscreen ? 'calc(100% - 40px)' : 'auto' }}>
          <pre 
            ref={contentRef}
            className="result-output"
            id={terminalId}
            style={{ 
              maxHeight: isFullscreen ? '100%' : '400px',
              fontSize: '0.95rem',
              lineHeight: '1.5'
            }}
            dangerouslySetInnerHTML={{ __html: formatTerminalOutput(cleanOutput) }}
          />
          
          {files && files.length > 0 && (
            <div className="generated-files">
              <h4 className="flex items-center">
                <Download size={16} className="mr-2" /> 
                Generated Files
              </h4>
              <ul>
                {files.map(file => (
                  <li key={file.name}>
                    <a href={file.downloadUrl} download={file.name}>
                      {file.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CodeExecutionResult; 