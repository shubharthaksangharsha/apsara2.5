import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ClipboardCopy, RefreshCw } from 'lucide-react';
import CodeBlock from './CodeBlock';
import CodeExecutionResult from './CodeExecutionResult';
import ThoughtSummary from './ThoughtSummary';
import SourceButton from './SourceButton';
import FunctionCallStatus from './FunctionCallStatus';
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
 * @param {Function} props.handleReloadMessage - Handler for reloading/regenerating a message
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
  renderStreamingText,
  handleReloadMessage
}) => {
  // Extract thought content and other parts
  let thoughtContent = '';
  let regularContentParts = [];

  if (message.parts && message.parts.length > 0) {
    message.parts.forEach(part => {
      if (part.thought && typeof part.text === 'string') {
        thoughtContent += part.text + '\n'; // Accumulate thought text
      } else if (part.text || part.executableCode || part.codeExecutionResult || part.inlineData || part.imageLoading || part.functionCall || part.functionResult) {
        regularContentParts.push(part);
      }
    });
  }

  // Determine base class for message based on type
  const baseClass = isError ? ERROR_MESSAGE_CLASSES : isSystem ? SYSTEM_MESSAGE_CLASSES : MODEL_MESSAGE_CLASSES;
  
  // Log full message for debugging
  console.log("Message data in ModelMessage:", message);
  
  // Check for source metadata in multiple possible locations
  let sourceMetadata = null;
  
  // Check in the message directly
  if (message.url_context_metadata?.url_metadata?.length > 0 || 
      message.groundingMetadata?.groundingChunks?.length > 0) {
    sourceMetadata = {
      url_context_metadata: message.url_context_metadata,
      groundingMetadata: message.groundingMetadata
    };
  }
  // Check in functionResponse.response.result for URL context
  else if (message.functionResponse?.response?.result?.url_context_metadata?.url_metadata?.length > 0) {
    sourceMetadata = {
      url_context_metadata: message.functionResponse.response.result.url_context_metadata,
      groundingMetadata: null
    };
    console.log("Found URL context metadata in functionResponse:", sourceMetadata.url_context_metadata);
  }
  // Check in functionResponse.response.result for Google Search
  else if (message.functionResponse?.response?.result?.groundingMetadata?.groundingChunks?.length > 0) {
    sourceMetadata = {
      url_context_metadata: null,
      groundingMetadata: message.functionResponse.response.result.groundingMetadata
    };
    console.log("Found grounding metadata in functionResponse:", sourceMetadata.groundingMetadata);
  }

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
            } else if (part.imageLoading) {
              // Handle image loading spinner
              console.log('🖼️ Rendering image loading spinner:', part);
              return (
                <div
                  key={`${partId}-loading`}
                  className="my-2 p-4 bg-gray-100 dark:bg-gray-900/30 rounded-md inline-block"
                >
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {part.loadingText || `Generating image...`}
                    </div>
                  </div>
                </div>
              );
            } else if (part.functionCall) {
              // Handle function call status
              return (
                <FunctionCallStatus
                  key={`${partId}-function-call`}
                  functionName={part.functionCall.name}
                  status="executing"
                />
              );
            } else if (part.functionResult) {
              // Handle function result
              return (
                <FunctionCallStatus
                  key={`${partId}-function-result`}
                  functionName={part.functionResult.name}
                  status="completed"
                  result={part.functionResult.result}
                />
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
                          // Multi-line code block - render directly without wrapper
                          return (
                            <CodeBlock
                              codeContent={String(children).replace(/\n$/, '')}
                              language={language}
                              uniqueId={`${uniqueId}-fallback-code`}
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
        
        {/* Source metadata button */}
        {!isStreaming && sourceMetadata && (
          <SourceButton metadata={sourceMetadata} />
        )}
      </div>
      
      {/* Special handling for user message with functionResponse */}
      {message.role === 'user' && message.functionResponse && (
        <div className="w-full mt-2">
          {message.functionResponse.name === 'urlContext' && 
           message.functionResponse.response?.result?.url_context_metadata?.url_metadata?.length > 0 && (
            <SourceButton
              metadata={{
                url_context_metadata: message.functionResponse.response.result.url_context_metadata,
                groundingMetadata: null
              }}
            />
          )}
          
          {message.functionResponse.name === 'googleSearch' && 
           message.functionResponse.response?.result?.groundingMetadata?.groundingChunks?.length > 0 && (
            <SourceButton
              metadata={{
                url_context_metadata: null,
                groundingMetadata: message.functionResponse.response.result.groundingMetadata
              }}
            />
          )}
        </div>
      )}
      
      {/* Copy button for model messages (not for system or error, and not while streaming) */}
      {message.role === 'model' && !isStreaming && !isSystem && !isError && (
        <div className="flex justify-start mt-1 mb-2 gap-2">
          <button
            className={`${COPY_BUTTON_CLASSES} ${copiedMsgId === (message.id || uniqueId) ? 'text-green-600 dark:text-green-500' : ''}`}
            onClick={() => handleCopyMessage(
              message.id || uniqueId, 
              (message.parts ? message.parts.map(p => p.text).filter(Boolean).join(' ') : message.text || '')
            )}
            aria-label={copiedMsgId === (message.id || uniqueId) ? "Copied to clipboard" : "Copy to clipboard"}
            title={copiedMsgId === (message.id || uniqueId) ? "Copied to clipboard" : "Copy to clipboard"}
          >
            <ClipboardCopy className="w-4 h-4" />
            <span className="text-xs">{copiedMsgId === (message.id || uniqueId) ? "Copied" : "Copy"}</span>
          </button>
          
          {/* Reload button */}
          {handleReloadMessage && (
            <button
              className={`${COPY_BUTTON_CLASSES}`}
              onClick={() => handleReloadMessage(message)}
              aria-label="Regenerate response"
              title="Regenerate response"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs">Reload</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelMessage; 