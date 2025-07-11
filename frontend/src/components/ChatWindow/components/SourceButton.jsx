import React, { useState } from 'react';
import { Link as LinkIcon } from 'lucide-react';
import Sources from './Sources';

/**
 * Source button component that appears in model messages
 * 
 * @param {Object} props - Component props
 * @param {Object} props.metadata - Metadata from URL context or Google Search
 * @returns {JSX.Element} SourceButton component
 */
export default function SourceButton({ metadata }) {
  const [showSources, setShowSources] = useState(false);
  
  if (!metadata) return null;
  
  // Debug the metadata received to help diagnose issues
  console.log("Source metadata received:", metadata);
  
  // Determine source type and count
  const hasUrlContext = metadata.url_context_metadata?.url_metadata?.length > 0;
  const hasGroundingMetadata = metadata.groundingMetadata?.groundingChunks?.length > 0;
  
  let sourceType = '';
  let sourceCount = 0;
  let sources = [];
  
  if (hasUrlContext) {
    sourceType = 'urlContext';
    sources = metadata.url_context_metadata.url_metadata;
    sourceCount = sources.length;
    console.log("URL Context sources found:", sourceCount, sources);
  } else if (hasGroundingMetadata) {
    sourceType = 'googleSearch';
    sources = metadata.groundingMetadata;
    sourceCount = metadata.groundingMetadata.groundingChunks?.length || 0;
    console.log("Google Search sources found:", sourceCount);
  } else {
    console.log("No sources found in metadata:", metadata);
    return null;
  }

  return (
    <>
      <button 
        onClick={() => setShowSources(true)}
        className="flex items-center gap-1.5 text-xs py-1 px-3 mt-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-800/50 border border-blue-200 dark:border-blue-800"
      >
        <LinkIcon className="h-3 w-3" />
        <span>Sources</span>
        <span className="bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full h-4 w-4 inline-flex items-center justify-center text-[10px] ml-1">
          {sourceCount}
        </span>
      </button>
      
      {showSources && (
        <Sources 
          sources={sources} 
          sourceType={sourceType}
          onClose={() => setShowSources(false)} 
        />
      )}
    </>
  );
} 