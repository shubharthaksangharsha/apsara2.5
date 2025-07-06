import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ClipboardCopy } from 'lucide-react';
import CodeBlock from './CodeBlock';
import CodeExecutionResult from './CodeExecutionResult';
import ThoughtSummary from './ThoughtSummary';
import { MODEL_MESSAGE_CLASSES, SYSTEM_MESSAGE_CLASSES, ERROR_MESSAGE_CLASSES, COPY_BUTTON_CLASSES } from '../constants';

/**
 * Model message component that handles different message parts including code, execution results, and thoughts
 * 
 * @param {Object} props - Component props
 * @param {Object} props.message - The model message data
 * @param {string} props.uniqueId - Unique identifier for this message
 * @param {boolean} props.isSystem - Whether this is a system message
 * @param {boolean} props.isError - Whether this is an error message
 * @param {boolean} props.isStreaming - Whether this message is currently streaming
 * @param {string|null} props.copiedMsgId - ID of the currently copied message, if any
 * @param {Function} props.handleCopyMessage - Handler for copying message
 * @param {Function} props.handleImageClick - Handler for clicking on an image
 * @param {Object} props.collapsedSections - Object tracking collapsed state for different sections
 * @param {Object} props.copiedStates - Object tracking copy states for different code blocks
 * @param {Function} props.handleCopyCode - Handler for copying code
 * @param {Function} props.toggleCollapse - Handler for toggling collapse state
 * @param {Function} props.renderStreamingText - Handler for rendering streaming text
 * @returns {JSX.Element} ModelMessage component
 */
const ModelMessage = ({
  message,
  uniqueId,
  isSystem,
  isError,
  isStreaming,
  copiedMsgId,
  handleCopyMessage,
  handleImageClick,
  collapsedSections,
  copiedStates,
  handleCopyCode,
  toggleCollapse,
  renderStreamingText
}) => {
  // Extract thought content and other parts
  let thoughtContent = '';
  let regularContentParts = [];

  if (message.parts && message.parts.length > 0) {
    message.parts.forEach(part => {
      if (part.thought && typeof part.text === 'string') {
        thoughtContent += part.text + '\n'; // Accumulate thought text
      } else if (part.text || part.executableCode || part.codeExecutionResult || part.inlineData) {
        regularContentParts.push(part);
      }
    });
  }

  // Determine base class for message based on type
  const baseClass = isError ? ERROR_MESSAGE_CLASSES : isSystem ? SYSTEM_MESSAGE_CLASSES : MODEL_MESSAGE_CLASSES;

  return (
    <div className={`flex flex-col items-start w-full group ${isSystem ? 'items-center' : ''}`}>
      <div className={`w-full text-gray-800 dark:text-gray-200 ${isSystem ? 'text-center' : ''}`}>
        {/* Render thought summary if available */}
        {thoughtContent.trim() && (
          <ThoughtSummary
            thoughtText={thoughtContent.trim()}
            uniqueId={`${uniqueId}-thoughtsBlock`}
            isCollapsed={collapsedSections[`${uniqueId}-thoughtsBlock-thought`]}
            toggleCollapse={toggleCollapse}
          />
        )}
        
        {/* Render other content parts */}
        {regularContentParts.length > 0 ? (
          regularContentParts.map((part, i) => {
            const partId = `${uniqueId}-part-${i}`;
            
            if (part.text) { 
              return (
                <div
                  key={`${partId}-text`}
                  className={baseClass}
                >
                  {isStreaming && regularContentParts.length === 1 && message.parts.length === 1 ? (
                    renderStreamingText(part.text)
                  ) : (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code: ({ node, inline, className, children, ...props }) => {
                          const match = /language-(\w+)/.exec(className || '');
                          const language = match ? match[1] : '';
                          
                          if (!inline && language) {
                            // Multi-line code block - render directly without wrapper
                            return (
                              <CodeBlock
                                codeContent={String(children).replace(/\n$/, '')}
                                language={language}
                                uniqueId={`${partId}-markdown-code-${i}`}
                                copiedStates={copiedStates}
                                handleCopyCode={handleCopyCode}
                              />
                            );
                          } else {
                            // Inline code - use default styling
                            return (
                              <code 
                                className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          }
                        }
                      }}
                    >
                      {part.text}
                    </ReactMarkdown>
                  )}
                </div>
              );
            } else if (part.executableCode) {
              return (
                <CodeBlock
                  key={`${partId}-code`}
                  codeContent={part.executableCode.code}
                  language={part.executableCode.language}
                  uniqueId={partId}
                  copiedStates={copiedStates}
                  handleCopyCode={handleCopyCode}
                />
              );
            } else if (part.codeExecutionResult) {
              return (
                <CodeExecutionResult
                  key={`${partId}-result`}
                  resultOutput={part.codeExecutionResult.output}
                  uniqueId={partId}
                  isCollapsed={collapsedSections[`${partId}-output`]}
                  toggleCollapse={toggleCollapse}
                />
              );
            } else if (part.inlineData?.mimeType?.startsWith('image/')) {
              return (
                <div
                  key={`${partId}-img`}
                  className="my-2 p-1 bg-gray-100 dark:bg-gray-900/30 rounded-md inline-block cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                  onClick={() => handleImageClick(part.inlineData)}
                >
                  <img
                    src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
                    alt="Generated content"
                    className="max-w-md h-auto rounded"
                  />
                </div>
              );
            }
            
            return null;
          })
        ) : (
          // Fallback for messages with no parts array or simple text
          <>
            {message.text && !thoughtContent.trim() && (
              <div className={baseClass}>
                {isStreaming ? (
                  renderStreamingText(message.text)
                ) : (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code: ({ node, inline, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        
                        if (!inline && language) {
                          // Multi-line code block - render outside prose container
                          return (
                            <div className="not-prose">
                              <CodeBlock
                                codeContent={String(children).replace(/\n$/, '')}
                                language={language}
                                uniqueId={`${uniqueId}-fallback-code`}
                                copiedStates={copiedStates}
                                handleCopyCode={handleCopyCode}
                              />
                            </div>
                          );
                        } else {
                          // Inline code - use default styling
                          return (
                            <code 
                              className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        }
                      }
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                )}
              </div>
            )}
            {/* Handle legacy code blocks */}
            {message.executableCode && (
              <CodeBlock
                codeContent={message.executableCode.code}
                language={message.executableCode.language}
                uniqueId={`${uniqueId}-topLegacyCode`}
                copiedStates={copiedStates}
                handleCopyCode={handleCopyCode}
              />
            )}
            {message.codeExecutionResult && (
              <CodeExecutionResult
                resultOutput={message.codeExecutionResult.output}
                uniqueId={`${uniqueId}-topLegacyResult`}
                isCollapsed={collapsedSections[`${uniqueId}-topLegacyResult-output`]}
                toggleCollapse={toggleCollapse}
              />
            )}
          </>
        )}
      </div>
      
      {/* Copy button for model messages (not for system or error, and not while streaming) */}
      {message.role === 'model' && !isStreaming && !isSystem && !isError && (
        <div className="flex justify-start mt-1 mb-2">
          <button
            className={COPY_BUTTON_CLASSES}
            title="Copy message"
            onClick={() => handleCopyMessage(
              message.id || uniqueId, 
              (message.parts ? message.parts.map(p => p.text).filter(Boolean).join(' ') : message.text || '')
            )}
          >
            <ClipboardCopy className="w-4 h-4" />
            {copiedMsgId === (message.id || uniqueId) ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ModelMessage; 