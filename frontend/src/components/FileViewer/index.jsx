import React, { useState, useEffect } from 'react';
import { X, Download, ExternalLink, FileText, Eye, AlertCircle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:9000';

/**
 * File viewer component for displaying PDFs and documents
 * 
 * @param {Object} props - Component props
 * @param {Object} props.file - File object to display
 * @param {boolean} props.isOpen - Whether the viewer is open
 * @param {Function} props.onClose - Function to close the viewer
 * @returns {JSX.Element} File viewer component
 */
export default function FileViewer({ file, isOpen, onClose }) {
  const [viewerError, setViewerError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reset state when file or isOpen changes - this useEffect always runs
  useEffect(() => {
    if (isOpen && file) {
      setIsLoading(true);
      setViewerError(null);
    }
  }, [isOpen, file]);

  // Add timeout for loading - this useEffect always runs
  useEffect(() => {
    let timeout;
    if (isLoading && isOpen && file) {
      timeout = setTimeout(() => {
        setIsLoading(false);
        setViewerError('File loading timed out. Try opening in a new tab.');
      }, 10000); // 10 second timeout
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isLoading, isOpen, file]);

  // Don't render anything if not open
  if (!isOpen) return null;

  // Show error state if no file
  if (!file) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No file to display</h3>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPdf = file.mimetype === 'application/pdf';
  const isViewable = isPdf || file.mimetype?.startsWith('text/') || 
                     file.mimetype?.includes('document') || 
                     file.mimetype?.includes('presentation') ||
                     file.mimetype?.includes('spreadsheet');

  // Google Files API limitation: Files cannot be downloaded or accessed directly
  // They are only available for AI processing and are automatically deleted after 48 hours
  const contentUrl = null;

  const handleDownload = () => {
    alert('File downloads are not supported for files stored in Google Files API. Files are automatically deleted after 48 hours and are meant for AI processing only.');
  };

  const handleOpenExternal = () => {
    alert('Direct file access is not supported for files stored in Google Files API. Files are automatically deleted after 48 hours and are meant for AI processing only.');
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setViewerError('Unable to display file in viewer. The file may require special permissions or cannot be embedded.');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {file.originalname || 'Document'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {file.mimetype} • {file.size ? `${Math.round(file.size / 1024)}KB` : 'Unknown size'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Download file"
            >
              <Download className="h-5 w-5" />
            </button>
            
            <button
              onClick={handleOpenExternal}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Open in new tab"
            >
              <ExternalLink className="h-5 w-5" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-gray-50 dark:bg-gray-900">
          {!contentUrl && (
            <div className="flex flex-col items-center justify-center h-full text-blue-600 dark:text-blue-400">
              <FileText className="h-16 w-16 mb-4" />
              <h3 className="text-lg font-medium mb-2">File stored for AI processing only</h3>
              <p className="text-sm text-center mb-4 max-w-md">
                Files uploaded to Google Files API are meant for AI processing only. 
                They cannot be downloaded or previewed directly and are automatically deleted after 48 hours.
              </p>
              <div className="text-xs text-center text-gray-500 dark:text-gray-400 max-w-md bg-gray-100 dark:bg-gray-700 p-3 rounded">
                <p className="mb-1">
                  <strong>File:</strong> {file.originalname || 'Unknown'}
                </p>
                <p className="mb-1">
                  <strong>Type:</strong> {file.mimetype || 'Unknown'}
                </p>
                <p>
                  <strong>Size:</strong> {file.size || file.sizeBytes ? `${Math.round((file.size || file.sizeBytes) / 1024)}KB` : 'Unknown'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
