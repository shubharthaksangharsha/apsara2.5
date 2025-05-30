import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ImageModal from './ImageModal';
import StreamingApsaraLogo from './StreamingApsaraLogo';
import { ClipboardCopy, ChevronDown, ChevronUp, BrainCircuit } from 'lucide-react'; // Added BrainCircuit

// Helper function to detect code blocks for specific styling
// const isCodePart = (part) => part.executableCode || part.codeExecutionResult; // We'll handle this within the markdown components

export default function ChatWindow({ convo, streamingModelMessageId, isLoading }) {
  const messagesEndRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState(null);
  const [copiedStates, setCopiedStates] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convo?.messages]); // Add safe navigation

  const handleImageClick = (imageData) => {
    setSelectedImageData(imageData);
    setModalOpen(true);
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
      // Optionally, add user feedback for copy failure
    });
  };

  const toggleCollapse = (sectionId) => {
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleCopyMessage = (msgId, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 1500);
    });
  };

  if (!convo) return null;
  
  // Show animation either during streaming or during regular loading
  const isThinking = streamingModelMessageId !== null || isLoading;
  
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
  
  const renderCodeBlock = (codeContent, language, uniqueIdPrefix) => {
    const sectionId = `${uniqueIdPrefix}-code`;
    const isCollapsed = collapsedSections[sectionId];
    return (
      <div key={sectionId} className="my-3 bg-gray-800 dark:bg-black rounded-md overflow-hidden shadow">
        <div className="px-4 py-2 text-xs text-gray-300 dark:text-gray-400 bg-gray-700 dark:bg-gray-900/70 flex justify-between items-center">
          <span>{language?.toLowerCase() || 'code'}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopyCode(codeContent, sectionId)}
              className="p-1 text-gray-300 hover:text-white transition"
              title="Copy code"
            >
              {copiedStates[sectionId] ? <span className="text-xs">Copied!</span> : <ClipboardCopy size={14} />}
            </button>
            <button
              onClick={() => toggleCollapse(sectionId)}
              className="p-1 text-gray-300 hover:text-white transition"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>
        </div>
        {!isCollapsed && (
          <pre className="p-4 overflow-x-auto custom-scrollbar text-sm">
            <code className={`language-${language?.toLowerCase() || ''} text-gray-100 dark:text-gray-200`}>
              {codeContent}
            </code>
          </pre>
        )}
      </div>
    );
  };

  const renderCodeExecutionResult = (resultOutput, uniqueIdPrefix) => {
    const sectionId = `${uniqueIdPrefix}-output`;
    const isCollapsed = collapsedSections[sectionId];
    return (
      <div key={sectionId} className="my-2 text-sm">
        <div className="flex justify-between items-center px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400 rounded-r-md">
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
            <pre className="whitespace-pre-wrap font-mono text-xs mt-1 p-3 bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500 dark:border-green-400 rounded-r-md">
                {resultOutput}
            </pre>
        )}
      </div>
    );
  };

  // Helper function to detect code blocks for specific styling
  const renderThoughtSummary = (thoughtText, uniqueIdPrefix) => {
    const sectionId = `${uniqueIdPrefix}-thought`;
    const isCollapsed = collapsedSections[sectionId] === undefined ? false : collapsedSections[sectionId];
    return (
      <div key={sectionId} className="my-2 text-sm">
        <div 
          className="flex justify-between items-center px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 dark:border-purple-400 rounded-r-md cursor-pointer transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/30"
          onClick={() => toggleCollapse(sectionId)} // Consolidated onClick here
        >
          <div className="flex items-center gap-2">
            <BrainCircuit size={16} className="text-purple-600 dark:text-purple-300 flex-shrink-0" />
            <span className="font-semibold text-gray-800 dark:text-purple-300">Details</span>
          </div>
          <button
            // onClick is now handled by the parent div, but keep button for semantics & styling if needed
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition rounded-full"
            title={isCollapsed ? "Show details" : "Hide details"}
            aria-label={isCollapsed ? "Show details" : "Hide details"}
            aria-expanded={!isCollapsed} // Added aria-expanded for accessibility
            type="button" // Explicitly set button type
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
        {!isCollapsed && (
          <div className="prose prose-sm dark:prose-invert max-w-none mt-1 p-3 bg-purple-50 dark:bg-purple-900/10 border-l-4 border-purple-500 dark:border-purple-400 rounded-r-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {thoughtText}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 pb-4">
      {(convo.messages || []).map((msg, idx, arr) => {
        const isUser = msg.role === 'user';
        const isError = msg.role === 'error';
        const isSystem = msg.role === 'system';
        const isStreaming = msg.id === streamingModelMessageId;
        const isLastUser = isUser && (idx === arr.length - 1 || arr.slice(idx + 1).findIndex(m => m.role === 'user') === -1);

        // Render user message
        if (isUser) {
          return (
            <React.Fragment key={msg.id || idx}>
              <div className="flex justify-end group">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 break-words bg-indigo-500 text-white shadow-md">
                  {(msg.parts || []).map((part, i) =>
                    part.text ? (
                      <div key={`${msg.id || idx}-text-${i}`} className="whitespace-pre-wrap">
                        {part.text}
                      </div>
                    ) : null
                  )}
                  {!msg.parts && msg.text && (
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  )}
                </div>
              </div>
              {/* Copy icon below user bubble */}
              <div className="flex justify-end mt-1 mb-2">
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-500 dark:text-indigo-300 text-xs transition"
                  title="Copy message"
                  onClick={() => handleCopyMessage(msg.id || idx, (msg.parts ? msg.parts.map(p => p.text).filter(Boolean).join(' ') : msg.text || ''))}
                >
                  <ClipboardCopy className="w-4 h-4" />
                  {copiedMsgId === (msg.id || idx) ? 'Copied!' : 'Copy'}
                </button>
              </div>
              {/* Show streaming logo/animation right after the last user message if streaming/loading */}
              {isLastUser && (isThinking || streamingModelMessageId !== null) && (
                <div className="flex items-center pt-2 pb-2">
                  <StreamingApsaraLogo isVisible={true} />
                </div>
              )}
            </React.Fragment>
          );
        } else {
          // --- Apsara, System, or Error Messages ---
          let thoughtContent = '';
          let regularContentParts = [];

          if (msg.parts && msg.parts.length > 0) {
            msg.parts.forEach(part => {
              // Prioritize the 'thought' property for categorization
              if (part.thought && typeof part.text === 'string') {
                thoughtContent += part.text + '\n'; // Accumulate thought text
              } else if (part.text || part.executableCode || part.codeExecutionResult || part.inlineData) {
                // Only add to regularContentParts if it's not a thought and has other content
                regularContentParts.push(part);
              }
            });
          }

          return (
            <div key={msg.id || idx} className={`flex flex-col items-start w-full group ${isSystem ? 'items-center' : ''}`}>
              <div className={`w-full text-gray-800 dark:text-gray-200 ${isSystem ? 'text-center' : ''}`}>
                {/* Render accumulated thoughts first if any */}
                {thoughtContent.trim() && renderThoughtSummary(thoughtContent.trim(), `${msg.id || idx}-thoughtsBlock`)}
                
                {/* Then render other parts */}
                {regularContentParts.length > 0 ? (
                  regularContentParts.map((part, i) => {
                    const partId = `${msg.id || idx}-part-${i}`;
                    // This condition ensures we don't re-render thoughts here (already handled by the check above)
                    if (part.text) { 
                      return (
                        <div
                          key={`${partId}-text`}
                          className={`prose prose-sm dark:prose-invert max-w-none py-1 ${
                            isError ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-3 rounded-md' :
                            isSystem ? 'text-sm text-gray-500 dark:text-gray-400 italic px-3 py-2 bg-gray-100 dark:bg-gray-700/50 rounded-md' :
                            ''
                          }`}
                        >
                          {isStreaming && regularContentParts.length === 1 && msg.parts.length === 1 ? (
                            renderStreamingText(part.text)
                          ) : (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {part.text}
                            </ReactMarkdown>
                          )}
                        </div>
                      );
                    } else if (part.executableCode) {
                      return renderCodeBlock(part.executableCode.code, part.executableCode.language, partId);
                    } else if (part.codeExecutionResult) {
                      return renderCodeExecutionResult(part.codeExecutionResult.output, partId);
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
                    } else {
                      return null;
                    }
                  })
                ) : (
                  // Fallback for messages with no 'parts' array or only thought parts that were already rendered
                  // or simple text messages without parts array
                  <>
                    {msg.text && !thoughtContent.trim() && ( // Render msg.text only if no thoughts were processed from parts
                       <div className={`prose prose-sm dark:prose-invert max-w-none py-1 ${
                            isError ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-3 rounded-md' :
                            isSystem ? 'text-sm text-gray-500 dark:text-gray-400 italic px-3 py-2 bg-gray-100 dark:bg-gray-700/50 rounded-md' :
                            ''
                          }`}
                       >
                         {isStreaming ? (
                           renderStreamingText(msg.text)
                         ) : (
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                         )}
                      </div>
                    )}
                    {/* Render legacy executableCode/codeExecutionResult if present directly on msg object */}
                    {msg.executableCode && renderCodeBlock(msg.executableCode.code, msg.executableCode.language, `${msg.id || idx}-topLegacyCode`)}
                    {msg.codeExecutionResult && renderCodeExecutionResult(msg.codeExecutionResult.output, `${msg.id || idx}-topLegacyResult`)}
                  </>
                )}
              </div>
              {/* Copy icon below model bubble, only after streaming is done and not for system/error */}
          {msg.role === 'model' && msg.id !== streamingModelMessageId && !isSystem && !isError && (
            <div className="flex justify-start mt-1 mb-2">
              <button
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-500 dark:text-indigo-300 text-xs transition"
                title="Copy message"
                onClick={() => handleCopyMessage(msg.id || idx, (msg.parts ? msg.parts.map(p => p.text).filter(Boolean).join(' ') : msg.text || ''))}
              >
                <ClipboardCopy className="w-4 h-4" />
                {copiedMsgId === (msg.id || idx) ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>
          );
        }
      })}
      
      <div ref={messagesEndRef} />
      <ImageModal isOpen={modalOpen} onClose={closeModal} imageData={selectedImageData} />
    </div>
  );
}