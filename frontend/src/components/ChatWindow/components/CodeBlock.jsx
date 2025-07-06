import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Copy, Download } from 'lucide-react';

/**          <pre 
            style={{ 
              backgroundColor: isDarkMode ? '#000000' : '#f5f5f5',
              borderLeft: isDarkMode ? '2px solid #374151' : '2px solid #9ca3af',
              borderRight: isDarkMode ? '2px solid #374151' : '2px solid #9ca3af',
              borderTop: 'none',
              borderBottom: 'none',
              margin: '0',
              padding: '1.25rem 1.5rem',
              overflow: 'auto',
              fontSize: '0.875rem',
              lineHeight: '1.6',
              minHeight: '4rem',
              display: 'block',
              boxSizing: 'border-box'
            }}
          >omponent with copy functionality - ChatGPT style
 * 
 * @param {Object} props - Component props
 * @param {string} props.codeContent - The code content to display
 * @param {string} props.language - The programming language of the code
 * @param {string} props.uniqueId - Unique identifier for this code block
 * @param {Object} props.copiedStates - Object tracking copy states for different code blocks
 * @param {Function} props.handleCopyCode - Handler for copying code
 * @returns {JSX.Element} CodeBlock component
 */
const CodeBlock = ({ 
  codeContent, 
  language, 
  uniqueId, 
  handleCopyCode
}) => {
  const sectionId = `${uniqueId}-code`;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode by observing the 'dark' class on document element
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    // Initial check
    checkDarkMode();
    
    // Observer for class changes on document element
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    return () => observer.disconnect();
  }, []);

  const handleCopyClick = () => {
    navigator.clipboard.writeText(codeContent);
  };

  const handleDownload = () => {
    // Get file extension based on language
    const getFileExtension = (lang) => {
      const extensions = {
        'python': 'py',
        'javascript': 'js',
        'typescript': 'ts',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'csharp': 'cs',
        'php': 'php',
        'ruby': 'rb',
        'go': 'go',
        'rust': 'rs',
        'swift': 'swift',
        'kotlin': 'kt',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'sql': 'sql',
        'json': 'json',
        'xml': 'xml',
        'yaml': 'yaml',
        'shell': 'sh',
        'bash': 'sh',
        'powershell': 'ps1',
        'markdown': 'md'
      };
      return extensions[lang?.toLowerCase()] || 'txt';
    };

    const extension = getFileExtension(language);
    const filename = `code.${language || 'text'}.${extension}`;
    
    const blob = new Blob([codeContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <>
      <div 
        style={{ 
          backgroundColor: isDarkMode ? '#374151' : '#d1d5db',
          border: isDarkMode ? '2px solid #374151' : '1px solid #9ca3af',
          borderRadius: '0.75rem 0.75rem 0 0',
          margin: '1rem 0 0 0',
          padding: '0.75rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: isDarkMode ? '#ffffff' : '#111827',
          boxSizing: 'border-box'
        }}
      >
        <span>{language?.toLowerCase() || 'code'}</span>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            width: '1rem',
            height: '1rem',
            backgroundColor: isDarkMode ? '#4b5563' : '#9ca3af',
            border: 'none',
            borderRadius: '0.375rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isDarkMode ? '#ffffff' : '#ffffff'
          }}
          title={isCollapsed ? 'Expand code' : 'Collapse code'}
        >
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>
      {!isCollapsed && (
        <>
          <pre 
            style={{ 
              backgroundColor: isDarkMode ? '#000000' : '#f5f5f5',
              borderLeft: isDarkMode ? '2px solid #374151' : '1px solid #9ca3af',
              borderRight: isDarkMode ? '2px solid #374151' : '1px solid #9ca3af',
              borderTop: 'none',
              borderBottom: 'none',
              margin: '0',
              padding: '1.25rem 0',
              overflow: 'auto',
              fontSize: '0.875rem',
              lineHeight: '1.6',
              minHeight: '4rem',
              display: 'flex',
              boxSizing: 'border-box'
            }}
          >
            {/* Line numbers column */}
            <div
              style={{
                backgroundColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                padding: '0 0.75rem',
                fontSize: '0.75rem',
                lineHeight: '1.6',
                textAlign: 'right',
                minWidth: '3rem',
                borderRight: isDarkMode ? '1px solid #374151' : '1px solid #d1d5db',
                userSelect: 'none',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
              }}
            >
              {codeContent.split('\n').map((_, index) => (
                <div key={index} style={{ height: '1.6em' }}>
                  {index + 1}
                </div>
              ))}
            </div>
            <code 
              style={{ 
                color: isDarkMode ? '#ffffff' : '#2d3748', 
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                fontWeight: '400',
                position: 'relative',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                tabSize: '4',
                display: 'block',
                marginLeft: '1rem',
                paddingLeft: '0.5rem',
                flex: '1'
              }}
            >
              {codeContent}
            </code>
          </pre>
          <div 
            style={{ 
              backgroundColor: isDarkMode ? '#374151' : '#d1d5db',
              border: isDarkMode ? '2px solid #374151' : '1px solid #9ca3af',
              borderTop: 'none',
              borderRadius: '0 0 0.75rem 0.75rem',
              margin: '0 0 1rem 0',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '0.5rem',
              boxSizing: 'border-box'
            }}
          >
            <button
              onClick={handleDownload}
              style={{
                width: '2rem',
                height: '2rem',
                backgroundColor: isDarkMode ? '#4b5563' : '#9ca3af',
                border: 'none',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: isDarkMode ? '#ffffff' : '#ffffff'
              }}
              title="Download code"
            >
              <Download size={16} />
            </button>
            <button
              onClick={handleCopyClick}
              style={{
                width: '2rem',
                height: '2rem',
                backgroundColor: isDarkMode ? '#4b5563' : '#9ca3af',
                border: 'none',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: isDarkMode ? '#ffffff' : '#ffffff'
              }}
              title="Copy code"
            >
              <Copy size={16} />
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default CodeBlock; 