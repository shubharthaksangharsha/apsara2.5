import React, { useEffect, useRef } from 'react';
import VideoStreamDisplay from './VideoStreamDisplay.jsx';

export default function ChatWindow({ convo }) {
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convo?.messages]); // Add safe navigation

  if (!convo) return null;
  
  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      {(convo.messages || []).map((msg, idx) => (
        <div
          key={msg.id || idx}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 break-words ${
              msg.role === 'user'
                ? 'bg-indigo-500 text-white'
                : msg.role === 'error'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : msg.role === 'system'
                ? 'bg-gray-200 dark:bg-gray-700 italic text-sm text-gray-600 dark:text-gray-300'
                : 'bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700'
            }`}
          >
            {(msg.parts || []).map((part, i) => {
              if (part.text) {
                return (
                  <div key={`${msg.id || idx}-text-${i}`} className="whitespace-pre-wrap">
                    {part.text}
                  </div>
                );
              }
              else if (part.executableCode) {
                return (
                  <div key={`${msg.id || idx}-code-${i}`} className="my-2 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-md overflow-x-auto custom-scrollbar">
                    <pre><code className={`language-${part.executableCode.language?.toLowerCase() || 'python'}`}>
                        {part.executableCode.code}
                    </code></pre>
                  </div>
                );
              }
              else if (part.codeExecutionResult) {
                 return (
                   <div key={`${msg.id || idx}-coderesult-${i}`} className="my-2 p-2 border-l-4 border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20 text-sm">
                       <pre className="whitespace-pre-wrap font-mono text-xs">Output: {part.codeExecutionResult.output}</pre>
                    </div>
                 );
              }
              else if (part.inlineData?.mimeType?.startsWith('image/')) {
                return (
                  <div key={`${msg.id || idx}-img-${i}`} className="my-2">
                    <img
                      src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
                      alt="Generated content"
                      className="max-w-full h-auto rounded-md"
                    />
                  </div>
                );
              }
              else {
                return null;
              }
            })}

            {(!msg.parts || msg.parts.every(p => p.text)) && (
              <>
                {msg.executableCode && (
                  <div key={`${msg.id || idx}-top-code`} className="my-2 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-md overflow-x-auto custom-scrollbar">
                    <pre><code className={`language-${msg.executableCode.language?.toLowerCase() || 'python'}`}>
                      {msg.executableCode.code}
                    </code></pre>
                  </div>
                )}
                {msg.codeExecutionResult && (
                  <div key={`${msg.id || idx}-top-coderesult`} className="my-2 p-2 border-l-4 border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20 text-sm">
                    <pre className="whitespace-pre-wrap font-mono text-xs">Output: {msg.codeExecutionResult.output}</pre>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}