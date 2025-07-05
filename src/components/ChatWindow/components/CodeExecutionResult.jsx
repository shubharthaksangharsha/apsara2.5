import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { 
  EXECUTION_RESULT_CONTAINER_CLASSES, 
  EXECUTION_RESULT_HEADER_CLASSES, 
  EXECUTION_RESULT_CONTENT_CLASSES 
} from '../constants';

/**
 * Code execution result component with collapsible content
 * 
 * @param {Object} props - Component props
 * @param {string} props.resultOutput - The output text to display
 * @param {string} props.uniqueId - Unique identifier for this result block
 * @param {boolean} props.isCollapsed - Whether the result is collapsed
 * @param {Function} props.toggleCollapse - Handler for toggling collapse state
 * @returns {JSX.Element} CodeExecutionResult component
 */
const CodeExecutionResult = ({ 
  resultOutput, 
  uniqueId, 
  isCollapsed, 
  toggleCollapse 
}) => {
  const sectionId = `${uniqueId}-output`;
  
  return (
    <div className={EXECUTION_RESULT_CONTAINER_CLASSES}>
      <div className={EXECUTION_RESULT_HEADER_CLASSES}>
        <span className="font-semibold text-gray-800 dark:text-green-300">Output:</span>
        <button
          onClick={() => toggleCollapse(sectionId)}
          className="p-1 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition"
          title={isCollapsed ? "Show output" : "Hide output"}
        >
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>
      {!isCollapsed && (
        <pre className={EXECUTION_RESULT_CONTENT_CLASSES}>
          {resultOutput}
        </pre>
      )}
    </div>
  );
};

export default CodeExecutionResult; 