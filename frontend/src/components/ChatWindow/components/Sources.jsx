import React, { useState } from 'react';
import { X, Link as LinkIcon, Search } from 'lucide-react';

/**
 * Sources component for displaying URL context and Google Search sources
 * 
 * @param {Object} props - Component props
 * @param {Array} props.sources - Array of sources from URL context tool or Google Search
 * @param {string} props.sourceType - Type of sources ('urlContext' or 'googleSearch')
 * @param {Function} props.onClose - Function to close the sources modal
 */
export default function Sources({ sources = [], sourceType = 'urlContext', onClose }) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            {sourceType === 'urlContext' ? (
              <LinkIcon className="h-5 w-5 text-blue-500" />
            ) : (
              <Search className="h-5 w-5 text-blue-500" />
            )}
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {sourceType === 'urlContext' ? 'URL Sources' : 'Search Sources'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto p-4 flex-grow">
          {sourceType === 'urlContext' ? (
            <UrlContextSources sources={sources} />
          ) : (
            <GoogleSearchSources sources={sources} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * URL Context Sources component
 */
function UrlContextSources({ sources }) {
  return (
    <div className="space-y-4">
      {sources.map((source, index) => (
        <div 
          key={`url-source-${index}`} 
          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
        >
          <a 
            href={source.retrieved_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-start gap-3"
          >
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2 flex-shrink-0">
              <LinkIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-grow">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 line-clamp-1 mb-1 hover:underline">
                {source.retrieved_url}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {source.url_retrieval_status === 'URL_RETRIEVAL_STATUS_SUCCESS' 
                  ? 'Successfully retrieved' 
                  : 'Retrieval status: ' + source.url_retrieval_status}
              </p>
            </div>
          </a>
        </div>
      ))}
    </div>
  );
}

/**
 * Google Search Sources component
 */
function GoogleSearchSources({ sources }) {
  return (
    <div className="space-y-4">
      {/* Search Queries Section */}
      {sources.webSearchQueries && sources.webSearchQueries.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Queries</h3>
          <div className="flex flex-wrap gap-2">
            {sources.webSearchQueries.map((query, index) => (
              <div 
                key={`query-${index}`}
                className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-700 dark:text-gray-300"
              >
                {query}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results Section */}
      {sources.groundingChunks && sources.groundingChunks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Results</h3>
          <div className="space-y-3">
            {sources.groundingChunks.map((chunk, index) => {
              if (!chunk.web) return null;
              
              return (
                <div 
                  key={`result-${index}`}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <a 
                    href={chunk.web.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-start gap-3"
                  >
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2 flex-shrink-0">
                      <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mb-1">
                        {chunk.web.title || 'Search Result'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {chunk.web.uri}
                      </p>
                    </div>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Results Found */}
      {(!sources.webSearchQueries || sources.webSearchQueries.length === 0) && 
       (!sources.groundingChunks || sources.groundingChunks.length === 0) && (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          No search results available
        </div>
      )}
    </div>
  );
} 