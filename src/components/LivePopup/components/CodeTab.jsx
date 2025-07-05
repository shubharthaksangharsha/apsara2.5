import React from 'react';
import { ClipboardCopy, Terminal } from 'lucide-react';

/**
 * CodeTab component that displays code snippets and outputs
 * 
 * @param {Object} props - Component props
 * @param {Array} props.messages - Messages containing code/output
 * @param {string|null} props.copiedContent - ID of currently copied content
 * @param {Function} props.handleCopyContent - Function to copy content
 * @returns {JSX.Element} CodeTab component
 */
const CodeTab = ({ messages, copiedContent, handleCopyContent }) => {
  // Process messages to create combined code/output content
  const combinedCodeOutputContent = [];
  const uniqueContentKeys = new Set();

  messages.forEach(msg => {
    if ((msg.role === 'model' && msg.parts) || msg.role === 'system_code_result') {
      // Handle Model parts
      msg.parts?.forEach((part, index) => {
        const partId = `${msg.id}-part-${index}`;
        let contentKey = null;
        let contentData = null;

        if (part.executableCode) {
          // Include message ID to make each code execution unique even with identical code
          contentKey = `code-${msg.id}-${part.executableCode.language}-${part.executableCode.code}`;
          contentData = { type: 'code', data: part.executableCode, id: partId };
        } else if (part.codeExecutionResult) {
          // Include message ID to make each result unique
          contentKey = `result-${msg.id}-${part.codeExecutionResult.outcome}-${part.codeExecutionResult.output}`;
          contentData = { type: 'result', data: part.codeExecutionResult, id: partId };
        } else if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
          // Use a shorter key for images if data string is too long
          const imageDataSubstr = part.inlineData.data.substring(0, 100);
          // Include message ID for images as well
          contentKey = `image-${msg.id}-${imageDataSubstr}`;
          contentData = { type: 'image', data: part.inlineData, id: partId };
        }

        if (contentKey && !uniqueContentKeys.has(contentKey)) {
          combinedCodeOutputContent.push(contentData);
          uniqueContentKeys.add(contentKey);
        }
      });

      // Handle legacy system_code_result
      if (msg.role === 'system_code_result' && msg.result) {
        const resultKey = `legacy-result-${msg.id}-${msg.result.outcome}-${msg.result.output}`;
        const partId = `${msg.id}-legacyresult`;
        if (!uniqueContentKeys.has(resultKey)) {
          combinedCodeOutputContent.push({ type: 'result', data: msg.result, id: partId });
          uniqueContentKeys.add(resultKey);
        }
      }
    }
  });

  return (
    <div className="space-y-1.5 p-0.5 sm:p-1">
      {combinedCodeOutputContent.length > 0 ? combinedCodeOutputContent.map(item => (
        <div key={item.id}>
          {item.type === 'code' && (
            <div className="my-1 bg-gray-800/95 rounded-md overflow-hidden shadow border-l-2 border-indigo-400 relative text-[10px] sm:text-xs">
              <div className="flex items-center justify-between px-2 py-1 sm:px-3 sm:py-1.5 bg-gray-700/80 text-indigo-200 font-mono">
                <span>{item.data.language?.toUpperCase() || 'CODE'}</span>
                <button 
                  className="flex items-center gap-1 text-indigo-300 hover:text-white transition text-[10px] sm:text-xs" 
                  onClick={() => handleCopyContent(item.data.code, item.id)} 
                  title="Copy code"
                >
                  <ClipboardCopy className="w-3 h-3" /> {copiedContent === item.id ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="p-2 sm:p-3.5 overflow-x-auto text-indigo-100 font-mono bg-gray-800/80 custom-scrollbar text-[10px] sm:text-xs">
                <code>{item.data.code}</code>
              </pre>
            </div>
          )}
          
          {item.type === 'result' && (
            (() => {
              const isError = item.data.outcome !== 'OUTCOME_OK';
              return (
                <div className={`my-1.5 rounded-md overflow-hidden shadow border-l-2 ${isError ? 'border-red-400 bg-red-50 dark:bg-red-900/30' : 'border-green-400 bg-green-50 dark:bg-green-900/20'} relative text-xs`}>
                  <div className={`flex items-center justify-between px-3 py-1 font-mono ${isError ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                    <span><Terminal size={12} className="inline mr-1" />Output ({item.data.outcome})</span>
                    <button 
                      className={`flex items-center gap-1 text-xs ${isError ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} dark:hover:text-white transition`} 
                      onClick={() => handleCopyContent(item.data.output, item.id)} 
                      title="Copy output"
                    >
                      <ClipboardCopy className="w-3 h-3" /> {copiedContent === item.id ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-3 overflow-x-auto font-mono custom-scrollbar">{item.data.output}</pre>
                </div>
              );
            })()
          )}
          
          {item.type === 'image' && (
            <div className="my-1.5 flex justify-center p-2 border rounded-md dark:border-gray-600 bg-gray-100 dark:bg-gray-700/30">
              <img 
                src={`data:${item.data.mimeType};base64,${item.data.data}`} 
                alt="Generated image output" 
                className="max-w-full h-auto rounded-md shadow"
              />
            </div>
          )}
        </div>
      )) : <p className="text-gray-500 dark:text-gray-400 text-xs p-3 text-center">No code snippets or outputs from the model yet.</p>}
    </div>
  );
};

export default CodeTab; 