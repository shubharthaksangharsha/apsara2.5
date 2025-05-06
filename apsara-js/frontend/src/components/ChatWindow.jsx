import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ImageModal from './ImageModal';
import StreamingApsaraLogo from './StreamingApsaraLogo';
import { ClipboardCopy, ChevronDown, ChevronUp } from 'lucide-react';

// Helper function to detect code blocks for specific styling
// const isCodePart = (part) => part.executableCode || part.codeExecutionResult; // We'll handle this within the markdown components

export default function ChatWindow({ convo, streamingModelMessageId }) {
  const messagesEndRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState(null);
  const [copiedStates, setCopiedStates] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});
  
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

  if (!convo) return null;
  
  const isStreaming = streamingModelMessageId !== null;
  
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

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 pb-4">
      {(convo.messages || []).map((msg, idx) => {
        const isUser = msg.role === 'user';
        const isError = msg.role === 'error';
        const isSystem = msg.role === 'system';

        if (isUser) {
          // --- User Messages ---
          return (
            <div key={msg.id || idx} className="flex justify-end group">
              <div
                className="max-w-[80%] rounded-2xl px-4 py-3 break-words bg-indigo-500 text-white shadow-md"
              >
                {(msg.parts || []).map((part, i) =>
                  part.text ? (
                    <div key={`${msg.id || idx}-text-${i}`} className="whitespace-pre-wrap">
                      {part.text}
                    </div>
                  ) : null // User messages typically don't have complex markdown or code
                )}
                {!msg.parts && msg.text && (
                   <div className="whitespace-pre-wrap">{msg.text}</div>
                )}
              </div>
            </div>
          );
        } else {
          // --- Apsara, System, or Error Messages ---
          return (
            <div key={msg.id || idx} className={`flex flex-col items-start w-full group ${isSystem ? 'items-center' : ''}`}>
              {/* Profile icon/name placeholder - for Apsara (can be added later) */}
              {/* {!isSystem && !isError && <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Apsara</div>} */}

              <div className={`w-full text-gray-800 dark:text-gray-200 ${isSystem ? 'text-center' : ''}`}>
                {(msg.parts && msg.parts.length > 0) ? (
                  msg.parts.map((part, i) => {
                    const partId = `${msg.id || idx}-part-${i}`;
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
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {part.text}
                          </ReactMarkdown>
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
                  // Fallback for messages with no 'parts' array
                  <>
                    {msg.text && (
                       <div className={`prose prose-sm dark:prose-invert max-w-none py-1 ${
                            isError ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-3 rounded-md' :
                            isSystem ? 'text-sm text-gray-500 dark:text-gray-400 italic px-3 py-2 bg-gray-100 dark:bg-gray-700/50 rounded-md' :
                            ''
                          }`}
                       >
                         <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                       </div>
                    )}
                    {msg.executableCode && renderCodeBlock(msg.executableCode.code, msg.executableCode.language, `${msg.id || idx}-topLegacy`)}
                    {msg.codeExecutionResult && renderCodeExecutionResult(msg.codeExecutionResult.output, `${msg.id || idx}-topLegacy`)}
                  </>
                )}
              </div>
            </div>
          );
        }
      })}
      
      {/* Show streaming logo when a message is streaming */}
      <StreamingApsaraLogo isVisible={isStreaming} />
      
      <div ref={messagesEndRef} />
      <ImageModal isOpen={modalOpen} onClose={closeModal} imageData={selectedImageData} />
    </div>
  );
}