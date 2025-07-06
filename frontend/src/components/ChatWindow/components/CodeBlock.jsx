import React from 'react';
import { ClipboardCopy } from 'lucide-react';
import { 
  CODE_BLOCK_CONTAINER_CLASSES, 
  CODE_BLOCK_HEADER_CLASSES, 
  CODE_BLOCK_CONTENT_CLASSES,
  CODE_BLOCK_BUTTON_CLASSES
} from '../constants';

/**
 * Code block component with copy functionality - ChatGPT style
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
  copiedStates, 
  handleCopyCode
}) => {
  const sectionId = `${uniqueId}-code`;
  
  return (
    <div className="not-prose my-4">
      <div className={CODE_BLOCK_HEADER_CLASSES}>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{language?.toLowerCase() || 'code'}</span>
        <button
          onClick={() => handleCopyCode(codeContent, sectionId)}
          className={CODE_BLOCK_BUTTON_CLASSES}
          title={copiedStates[sectionId] ? 'Copied!' : 'Copy code'}
        >
          <ClipboardCopy size={16} />
        </button>
      </div>
      <pre className={CODE_BLOCK_CONTENT_CLASSES}>
        <code className={`language-${language?.toLowerCase() || ''} text-gray-800 dark:text-gray-200`}>
          {codeContent}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock; 