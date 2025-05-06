import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ImageModal from './ImageModal';

// Helper function to detect code blocks for specific styling
// const isCodePart = (part) => part.executableCode || part.codeExecutionResult; // We'll handle this within the markdown components

export default function ChatWindow({ convo }) {
  const messagesEndRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState(null);
  
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

  if (!convo) return null;
  
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
                    if (part.text) {
                      return (
                        <div
                          key={`${msg.id || idx}-text-${i}`}
                          className={`prose prose-sm dark:prose-invert max-w-none py-1 ${ // Added prose for markdown styling
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
                      return (
                        <div key={`${msg.id || idx}-code-${i}`} className="my-3 bg-gray-800 dark:bg-black rounded-md overflow-hidden shadow">
                          <div className="px-4 py-2 text-xs text-gray-300 dark:text-gray-400 bg-gray-700 dark:bg-gray-900/70 flex justify-between items-center">
                            <span>{part.executableCode.language?.toLowerCase() || 'code'}</span>
                            {/* Add Copy button here later */}
                          </div>
                          <pre className="p-4 overflow-x-auto custom-scrollbar text-sm">
                            <code className={`language-${part.executableCode.language?.toLowerCase() || ''} text-gray-100 dark:text-gray-200`}>
                                {part.executableCode.code}
                            </code>
                          </pre>
                        </div>
                      );
                    } else if (part.codeExecutionResult) {
                      return (
                        <div key={`${msg.id || idx}-coderesult-${i}`} className="my-2 p-3 border-l-4 border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20 text-sm text-gray-800 dark:text-green-700">
                          <span className="font-semibold">Output:</span>
                          <pre className="whitespace-pre-wrap font-mono text-xs mt-1">{part.codeExecutionResult.output}</pre>
                        </div>
                      );
                    } else if (part.inlineData?.mimeType?.startsWith('image/')) {
                      return (
                        <div
                          key={`${msg.id || idx}-img-${i}`}
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
                    {/* Similar updates for top-level executableCode and codeExecutionResult if that structure is still used */}
                    {msg.executableCode && (
                      <div key={`${msg.id || idx}-top-code`} className="my-3 bg-gray-800 dark:bg-black rounded-md overflow-hidden shadow">
                         <div className="px-4 py-2 text-xs text-gray-300 dark:text-gray-400 bg-gray-700 dark:bg-gray-900/70 flex justify-between items-center">
                           <span>{msg.executableCode.language?.toLowerCase() || 'code'}</span>
                         </div>
                         <pre className="p-4 overflow-x-auto custom-scrollbar text-sm">
                           <code className={`language-${msg.executableCode.language?.toLowerCase() || ''} text-gray-100 dark:text-gray-200`}>{msg.executableCode.code}</code>
                         </pre>
                       </div>
                    )}
                    {msg.codeExecutionResult && (
                       <div key={`${msg.id || idx}-top-coderesult`} className="my-2 p-3 border-l-4 border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20 text-sm text-gray-800 dark:text-green-700">
                         <span className="font-semibold">Output:</span>
                         <pre className="whitespace-pre-wrap font-mono text-xs mt-1">{msg.codeExecutionResult.output}</pre>
                       </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        }
      })}
      <div ref={messagesEndRef} />
      <ImageModal isOpen={modalOpen} onClose={closeModal} imageData={selectedImageData} />
    </div>
  );
}