import React from 'react';
import { Terminal } from 'lucide-react';

/**
 * Renders message content specifically for chat tab
 * Only shows user messages, error messages, and icon system messages
 * Filters model messages to only include text parts
 * 
 * @param {Object} msg - The message object to render
 * @returns {JSX.Element|null} The rendered content or null if nothing to render
 */
export const renderChatMessageContent = (msg) => {
  // Show user messages as is
  if (msg.role === 'user') {
    return <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>;
  }

  // Show model messages: ONLY TEXT parts
  if (msg.role === 'model' && Array.isArray(msg.parts)) {
    // Filter parts to ONLY include those with 'text' property
    const textParts = msg.parts.filter(part => part.text !== undefined && part.text !== null);

    if (textParts.length > 0) {
      return textParts.map((part, i) => (
        <div key={`${msg.id}-chat-text-part-${i}`} className="whitespace-pre-wrap leading-relaxed">
          {part.text}
        </div>
      ));
    } else {
      // If a model message has NO text parts (e.g., only an image was generated),
      // return null so nothing is rendered for that message in the chat tab.
      return null;
    }
  }

  // Show error messages
  if (msg.role === 'error') {
    return <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>;
  }

  // Show system messages ONLY if they have an icon (intended for chat display)
  if (msg.role === 'system' && msg.icon && msg.text) {
     const IconComponent = msg.icon;
     return (
      <span className={`flex items-center gap-1.5 opacity-80 italic`}>
        <IconComponent className="h-4 w-4 inline-block opacity-70 flex-shrink-0" />
        <span>{msg.text}</span>
      </span>
     );
  }

  // Ignore all other message types/roles in chat
  return null;
};

/**
 * Renders general message content with support for rich content
 * Handles messages with icons, code blocks, and structured parts
 * 
 * @param {Object} msg - The message object to render
 * @returns {JSX.Element|null} The rendered content or null if nothing to render
 */
export const renderMessageContent = (msg) => {
  // --- Handle messages with explicit icons (usually system messages) ---
  if (msg.icon && msg.text) {
    const IconComponent = msg.icon;
    const isSystem = msg.role === 'system';
    return (
      <span className={`flex items-center gap-1.5 ${isSystem ? 'opacity-80 italic' : ''}`}>
        <IconComponent className="h-4 w-4 inline-block opacity-70 flex-shrink-0" />
        <span>{msg.text}</span> {/* Display text alongside icon */}
      </span>
    );
  } else if (msg.role === 'model_code' && msg.code) {
    return (
      <div className="my-1 p-2 bg-gray-100 dark:bg-gray-900/50 rounded-md overflow-x-auto custom-scrollbar text-xs mb-1">
        <span className="text-gray-500 dark:text-gray-400 block text-xs">Executable Code ({msg.code.language || 'PYTHON'}):</span>
        <pre><code className={`language-${msg.code.language?.toLowerCase() || 'python'}`}>
          {msg.code.code}
        </code></pre>
      </div>
    );
  } else if (msg.role === 'system_code_result' && msg.result) {
    const isError = msg.result.outcome !== 'OUTCOME_OK';
    const borderColor = isError ? 'border-red-500 dark:border-red-400' : 'border-green-500 dark:border-green-400';
    const bgColor = isError ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20';
    return (
      <div className={`my-1 p-1.5 border-l-4 ${borderColor} ${bgColor} text-xs`}>
        <pre className="whitespace-pre-wrap font-mono text-xs">Output ({msg.result.outcome}): {msg.result.output}</pre>
      </div>
    );
  }

  // --- Handle messages structured with parts (model/user/function) ---
  if (Array.isArray(msg.parts)) {
    return msg.parts.map((part, i) => {
      if (part.text) {
        return <div key={`part-text-${i}`} className="whitespace-pre-wrap">{part.text}</div>;
      } else if (part.inlineData?.mimeType?.startsWith('image/')) {
        return (
          <div key={`part-img-${i}`} className="my-2">
            <img
              src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
              alt="Generated content"
              className="max-w-full h-auto rounded-md border dark:border-gray-600" // Added border
            />
          </div>
        );
      } else if (part.executableCode) {
        return (
          <div key={`part-code-${i}`} className="my-1 p-2 bg-gray-100 dark:bg-gray-900/50 rounded-md overflow-x-auto custom-scrollbar text-xs">
            <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">Executable Code ({part.executableCode.language || 'PYTHON'}):</span>
            <pre><code className={`language-${part.executableCode.language?.toLowerCase() || 'python'}`}>{part.executableCode.code}</code></pre>
          </div>
        );
      } else if (part.codeExecutionResult) {
        const isError = part.codeExecutionResult.outcome !== 'OUTCOME_OK';
        const borderColor = isError ? 'border-red-500 dark:border-red-400' : 'border-green-500 dark:border-green-400';
        const bgColor = isError ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20';
        return (
          <div key={`part-coderesult-${i}`} className={`my-1 p-1.5 border-l-4 ${borderColor} ${bgColor} text-xs`}>
            <pre className="whitespace-pre-wrap font-mono text-xs">Output ({part.codeExecutionResult.outcome}): {part.codeExecutionResult.output}</pre>
          </div>
        );
      } else {
        return null; // Ignore other part types for now
      }
    }).filter(Boolean);
  }

  // --- Fallback for simple text messages (if parts logic fails or msg has no parts) ---
  return msg.text || null;
};

/**
 * Returns status indicator JSX based on connection status
 * 
 * @param {string} connectionStatus - Current connection status
 * @returns {JSX.Element} Visual indicator for connection status
 */
export const getStatusIndicator = (connectionStatus) => {
  switch (connectionStatus) {
    case 'connecting': return <span className="text-yellow-500 flex items-center gap-1.5"><div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>Connecting...</span>;
    case 'connected': return <span className="text-green-500 flex items-center gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-full"></div>Connected</span>;
    case 'error': return <span className="text-red-500 flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500 rounded-full"></div>Error</span>;
    case 'disconnected': return <span className="text-gray-500 flex items-center gap-1.5"><div className="w-2 h-2 bg-gray-500 rounded-full"></div>Disconnected</span>;
    default: return <span className="text-gray-500">Unknown</span>;
  }
}; 