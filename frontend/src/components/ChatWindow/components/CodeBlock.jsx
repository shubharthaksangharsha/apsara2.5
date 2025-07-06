import React from 'react';
import { ClipboardCopy, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  CODE_BLOCK_CONTAINER_CLASSES, 
  CODE_BLOCK_HEADER_CLASSES, 
  CODE_BLOCK_CONTENT_CLASSES,
  CODE_BLOCK_BUTTON_CLASSES
} from '../constants';

/**
 * Code block component with collapsible content and copy functionality
 * 
 * @param {Object} props - Component props
 * @param {string} props.codeContent - The code content to display
 * @param {string} props.language - The programming language of the code
 * @param {string} props.uniqueId - Unique identifier for this code block
 * @param {boolean} props.isCollapsed - Whether the code block is collapsed
 * @param {Object} props.copiedStates - Object tracking copy states for different code blocks
 * @param {Function} props.handleCopyCode - Handler for copying code
 * @param {Function} props.toggleCollapse - Handler for toggling collapse state
 * @returns {JSX.Element} CodeBlock component
 */
const CodeBlock = ({ 
  codeContent, 
  language, 
  uniqueId, 
  isCollapsed, 
  copiedStates, 
  handleCopyCode, 
  toggleCollapse 
}) => {
  const sectionId = `${uniqueId}-code`;
  
  return (
    <div className={CODE_BLOCK_CONTAINER_CLASSES}>
      <div className={CODE_BLOCK_HEADER_CLASSES}>
        <span>{language?.toLowerCase() || 'code'}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopyCode(codeContent, sectionId)}
            className={CODE_BLOCK_BUTTON_CLASSES}
            title="Copy code"
          >
            {copiedStates[sectionId] ? <span className="text-xs">Copied!</span> : <ClipboardCopy size={14} />}
          </button>
          <button
            onClick={() => toggleCollapse(sectionId)}
            className={CODE_BLOCK_BUTTON_CLASSES}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <pre className={CODE_BLOCK_CONTENT_CLASSES}>
          <code className={`language-${language?.toLowerCase() || ''} text-gray-100 dark:text-gray-200`}>
            {codeContent}
          </code>
        </pre>
      )}
    </div>
  );
};

export default CodeBlock; 