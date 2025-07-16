import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  THOUGHT_CONTAINER_CLASSES, 
  THOUGHT_HEADER_CLASSES, 
  THOUGHT_CONTENT_CLASSES 
} from '../constants';

/**
 * Thought summary component with collapsible content and markdown rendering
 * 
 * @param {Object} props - Component props
 * @param {string} props.thoughtText - The thought text to display (in markdown)
 * @param {string} props.uniqueId - Unique identifier for this thought block
 * @param {boolean} props.isCollapsed - Whether the thought is collapsed
 * @param {Function} props.toggleCollapse - Handler for toggling collapse state
 * @returns {JSX.Element} ThoughtSummary component
 */
const ThoughtSummary = ({ 
  thoughtText, 
  uniqueId, 
  isCollapsed, 
  toggleCollapse 
}) => {
  const sectionId = `${uniqueId}-thought`;
  
  return (
    <div className={THOUGHT_CONTAINER_CLASSES}>
      <div 
        className={THOUGHT_HEADER_CLASSES}
        onClick={() => toggleCollapse(sectionId)}
      >
        <div className="flex items-center gap-2">
          <BrainCircuit size={16} className="text-purple-600 dark:text-purple-300 flex-shrink-0" />
          <span className="font-semibold text-gray-800 dark:text-purple-300">{isCollapsed ? "Show Thoughts" : "Hide Thoughts"}</span>
        </div>
        <button
          className="p-1 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition rounded-full flex items-center gap-1"
          title={isCollapsed ? "Show thoughts" : "Hide thoughts"}
          aria-label={isCollapsed ? "Show thoughts" : "Hide thoughts"}
          aria-expanded={!isCollapsed}
          type="button"
        >
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>
      {!isCollapsed && (
        <div className={THOUGHT_CONTENT_CLASSES}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {thoughtText}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default ThoughtSummary;