import React, { useEffect, useState } from 'react';
import { FileText, X, Paperclip, Image as ImageIcon, Film, Type } from 'lucide-react';
import { countTokensForFile, initializeTokenCountsFromCache } from '../../services/tokenCounter';

// Helper function to get file icon based on MIME type
const getFileIcon = (mimeType = "") => {
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (mimeType.startsWith('application/pdf')) return <FileText className="h-4 w-4 text-red-500" />;
  if (mimeType.startsWith('video/')) return <Film className="h-4 w-4 text-purple-500" />;
  if (mimeType.startsWith('text/')) return <Type className="h-4 w-4 text-green-500" />;
  return <Paperclip className="h-4 w-4 text-gray-500" />;
};

// Helper function to calculate approximate token count for documents
const calculateTokenCount = (file) => {
  if (!file) return 0;
  
  // For PDF files, Gemini API documentation states: "Each document page is equivalent to 258 tokens"
  // We'll estimate based on file size as we don't have page count
  if (file.mimetype === 'application/pdf') {
    // Rough estimate: 1KB ≈ 6 tokens for PDF content
    return Math.round((file.size || 0) / 1024 * 6);
  }
  
  // For text files, rough estimate: 1KB ≈ 200 tokens
  if (file.mimetype?.startsWith('text/')) {
    return Math.round((file.size || 0) / 1024 * 200);
  }
  
  // For images, estimate based on visual content (static estimate)
  if (file.mimetype?.startsWith('image/')) {
    return 258; // Images typically use around 258 tokens minimum
  }
  
  // Default estimate for other file types
  return Math.round((file.size || 0) / 1024 * 4);
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * FileAttachment component - displays file attachments with token count
 * 
 * @param {Object} props - Component props
 * @param {Array} props.files - Array of file objects
 * @param {Function} props.onRemove - Function to remove a file
 * @param {boolean} props.readOnly - Whether to show the component in read-only mode (no remove button)
 * @param {boolean} props.skipTokenCounting - Whether to skip token counting (use cached values)
 * @param {Function} props.onFileClick - Function called when a file is clicked (for viewing)
 * @returns {JSX.Element} FileAttachment component
 */
export default function FileAttachment({ files = [], onRemove, readOnly = false, skipTokenCounting = false, onFileClick }) {
  const [fileTokenCounts, setFileTokenCounts] = useState({});

  // Count tokens for files when they change
  useEffect(() => {
    if (!files || files.length === 0) {
      setFileTokenCounts({});
      return;
    }

    const countTokensForAllFiles = async () => {
      const tokenCounts = {};
      
      // First, initialize files with cached token counts
      const filesWithCache = initializeTokenCountsFromCache(files);
      
      for (const file of filesWithCache) {
        const fileId = file.googleFileName || file.id || file.originalname;
        
        // Check if file already has a cached token count (from cache initialization)
        if (file.tokenCount && file.tokenCount > 0) {
          tokenCounts[fileId] = file.tokenCount;
          continue;
        }
        
        // Skip token counting if requested (for chat history) - use estimation
        if (skipTokenCounting) {
          tokenCounts[fileId] = calculateTokenCount(file);
          continue;
        }
        
        // Set placeholder while counting
        setFileTokenCounts(prev => ({ ...prev, [fileId]: -1 })); // -1 indicates "counting"
        
        try {
          const tokenCount = await countTokensForFile(file);
          setFileTokenCounts(prev => ({ ...prev, [fileId]: tokenCount }));
        } catch (error) {
          console.warn(`Failed to count tokens for ${fileId}, using estimation:`, error);
          const estimated = calculateTokenCount(file);
          setFileTokenCounts(prev => ({ ...prev, [fileId]: estimated }));
        }
      }
      
      // Set initial token counts for files with cached values
      setFileTokenCounts(tokenCounts);
    };

    countTokensForAllFiles();
  }, [files, skipTokenCounting]);

  if (!files || files.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
      {files.map((file, index) => {
        const fileId = file.googleFileName || file.id || file.originalname || `file-${index}`;
        const fileName = file.originalname || file.displayName || 'Unnamed File';
        const tokenCount = fileTokenCounts[fileId] || calculateTokenCount(file);
        // Create a unique key by combining fileId with index to avoid duplicates
        const uniqueKey = `${fileId}-${index}`;
        
        return (
          <div
            key={uniqueKey}
            className={`flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm max-w-xs ${
              onFileClick && readOnly ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600' : ''
            }`}
            onClick={onFileClick && readOnly ? () => onFileClick(file) : undefined}
            title={onFileClick && readOnly ? 'Click to view file' : fileName}
          >
            {/* File icon */}
            <div className="flex-shrink-0">
              {getFileIcon(file.mimetype)}
            </div>
            
            {/* File info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate" title={fileName}>
                {fileName.length > 20 ? `${fileName.substring(0, 17)}...` : fileName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {(() => {
                  const count = fileTokenCounts[fileId];
                  if (count === -1) {
                    return 'Counting tokens...';
                  } else if (count && count > 0) {
                    return `${count.toLocaleString()} tokens`;
                  } else {
                    // Use calculated token count as fallback
                    return `${calculateTokenCount(file).toLocaleString()} tokens`;
                  }
                })()}
              </div>
            </div>
            
            {/* Remove button */}
            {!readOnly && (
              <button
                onClick={() => onRemove(fileId)}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
