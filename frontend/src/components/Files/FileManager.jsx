import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  RefreshCw, 
  Download, 
  Info,
  CheckSquare,
  Square,
  AlertCircle,
  Clock,
  HardDrive,
  X,
  Eye,
  FileUp,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Film,
  Type
} from 'lucide-react';
import { useFileUpload } from '../../hooks/useFileUpload';
import { countTokensForFile } from '../../services/tokenCounter';
import { isGeminiSupported, getFileTypeName } from '../../utils/supportedFileTypes';

const FILE_TYPES = {
  'image/': 'Images',
  'application/pdf': 'PDFs',
  'text/': 'Text Files',
  'video/': 'Videos',
  'audio/': 'Audio Files',
  'application/': 'Documents'
};

// Helper function to get file icon based on MIME type
const getFileIcon = (mimeType = "") => {
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
  if (mimeType.startsWith('application/pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType.startsWith('video/')) return <Film className="h-5 w-5 text-purple-500" />;
  if (mimeType.startsWith('text/')) return <Type className="h-5 w-5 text-green-500" />;
  return <Paperclip className="h-5 w-5 text-gray-500" />;
};

/**
 * Comprehensive file management component
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the manager is open
 * @param {Function} props.onClose - Function to close the manager
 * @param {Function} props.onFileSelect - Function called when files are selected for use
 * @returns {JSX.Element} File manager component
 */
export default function FileManager({ isOpen, onClose, onFileSelect }) {
  const {
    files,
    isLoading,
    error,
    listFiles,
    removeFile,
    batchRemoveFiles,
    searchFiles,
    getFilesByType,
    getFileStats,
    uploadFile
  } = useFileUpload();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [enableCaching, setEnableCaching] = useState(true); // Cache by default
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  const hasLoadedFiles = useRef(false);

  // Filter files based on search and type
  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const matchesQuery = !searchQuery || 
        file.originalname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = !selectedType || file.mimetype?.startsWith(selectedType);
      
      return matchesQuery && matchesType;
    });
  }, [files, searchQuery, selectedType]);

  // Load files when component mounts - only once per open session
  useEffect(() => {
    if (isOpen && !hasLoadedFiles.current) {
      console.log('FileManager: Loading files, isOpen:', isOpen);
      hasLoadedFiles.current = true;
      listFiles(true).catch(err => console.error('Error loading files:', err));
    }
    
    // Reset the flag when modal closes
    if (!isOpen) {
      hasLoadedFiles.current = false;
    }
  }, [isOpen]); // Remove listFiles from dependencies

  // Update stats when files change
  useEffect(() => {
    console.log('FileManager: Files changed, count:', files.length);
    if (files.length > 0) {
      const newStats = {
        total: files.length,
        totalSize: files.reduce((sum, file) => sum + (file.size || 0), 0),
        types: {},
        expiring: []
      };

      files.forEach(file => {
        // Count by type
        const type = file.mimetype?.split('/')[0] || 'unknown';
        newStats.types[type] = (newStats.types[type] || 0) + 1;

        // Check expiration (Google Files API files expire after 48 hours)
        if (file.expirationTime) {
          const expirationDate = new Date(file.expirationTime);
          const now = new Date();
          const hoursLeft = (expirationDate - now) / (1000 * 60 * 60);
          
          if (hoursLeft < 24) { // Files expiring within 24 hours
            newStats.expiring.push({
              ...file,
              hoursLeft: Math.max(0, hoursLeft)
            });
          }
        }
      });

      setStats(newStats);
    } else {
      setStats(null);
    }
  }, [files]);

  const loadFiles = async () => {
    try {
      await listFiles(true); // Sync with Google Files API
    } catch (err) {
      console.error('Error loading files:', err);
    }
  };

  const handleRefresh = async () => {
    setSearchQuery('');
    setSelectedType('');
    setSelectedFiles([]);
    await loadFiles();
  };

  const handleFileSelect = (file) => {
    setSelectedFiles(prev => 
      prev.includes(file.id) 
        ? prev.filter(id => id !== file.id)
        : [...prev, file.id]
    );
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map(f => f.id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedFiles.length === 0) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedFiles.length} file(s)? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    try {
      await batchRemoveFiles(selectedFiles);
      setSelectedFiles([]);
    } catch (err) {
      console.error('Error deleting files:', err);
    }
  };

  const handleSingleDelete = async (fileId) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this file? This action cannot be undone.'
    );
    
    if (!confirmDelete) return;

    try {
      await removeFile(fileId);
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  };

  const handleUseFiles = async () => {
    const selectedFileObjects = files.filter(f => selectedFiles.includes(f.id));
    
    // Count tokens for selected files if not already counted
    for (const file of selectedFileObjects) {
      if (!file.tokenCount || file.tokenCount === 0) {
        try {
          const tokenCount = await countTokensForFile(file);
          file.tokenCount = tokenCount;
          console.log(`[FileManager] Counted tokens for ${file.originalname}: ${tokenCount}`);
        } catch (error) {
          console.warn(`[FileManager] Failed to count tokens for ${file.originalname}:`, error);
        }
      }
    }
    
    // Pass files with caching preference
    onFileSelect(selectedFileObjects, { enableCaching });
    onClose();
  };

  // File upload handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploading) return;
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
      setUploadError(null);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (uploading) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e) => {
    e.preventDefault();
    if (uploading) return;
    
    if (e.target.files && e.target.files[0]) {
      await handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    // Check if file type is supported by Gemini API
    if (!isGeminiSupported(file.type)) {
      const fileTypeName = getFileTypeName(file.type);
      setUploadError(`Cannot upload ${fileTypeName} files. This file type is not supported by Gemini AI. Supported types include: PDFs, images, text files, videos, and audio files.`);
      return;
    }
    
    setUploading(true);
    setUploadError(null);
    try {
      await uploadFile(file);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Refresh file list
      await loadFiles();
    } catch (err) {
      console.error('Error uploading file:', err);
      setUploadError(`Upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimeLeft = (hours) => {
    if (hours <= 0) return 'Expired';
    if (hours < 1) return `${Math.round(hours * 60)}m left`;
    if (hours < 24) return `${Math.round(hours)}h left`;
    return `${Math.round(hours / 24)}d left`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <HardDrive className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              File Manager
            </h2>
            {files.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {files.length} files
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Show statistics"
            >
              <Info className="h-5 w-5" />
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Upload Section */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
          <div 
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' 
                : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <FileUp className="h-8 w-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span className="font-medium">Click to upload</span> or drag and drop files here
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Supports images, PDFs, documents, text files, audio, and video files • Max: 2GB
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileInputChange}
              disabled={uploading}
              accept="image/*,application/pdf,text/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,audio/*,video/*"
            />
            
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75 rounded-lg">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">Uploading...</span>
                </div>
              </div>
            )}
          </div>
          
          {uploadError && (
            <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-lg">
              {uploadError}
            </div>
          )}
        </div>

        {/* Statistics Panel */}
        {showStats && stats && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {stats.total}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Total Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatFileSize(stats.totalSize)}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Total Size</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.expiring.length}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Expiring Soon</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {Object.keys(stats.types).length}
                </div>
                <div className="text-gray-600 dark:text-gray-400">File Types</div>
              </div>
            </div>
            
            {stats.expiring.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Files Expiring Soon</span>
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  {stats.expiring.map((file, index) => (
                    <div key={file.id} className="flex justify-between">
                      <span>{file.originalname || file.displayName}</span>
                      <span>{formatTimeLeft(file.hoursLeft)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                {Object.entries(FILE_TYPES).map(([type, label]) => (
                  <option key={type} value={type}>{label}</option>
                ))}
              </select>
            </div>

            {/* Batch Actions */}
            {selectedFiles.length > 0 && (
              <div className="flex flex-col gap-3">
                {/* Cache Option */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <button
                    onClick={() => setEnableCaching(!enableCaching)}
                    className="flex items-center gap-2 text-sm"
                  >
                    {enableCaching ? (
                      <CheckSquare className="h-4 w-4 text-indigo-600" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-gray-700 dark:text-gray-300">
                      Enable caching for cost savings
                    </span>
                  </button>
                  <div className="group relative">
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      Cache files to reduce API costs for repeated use
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleUseFiles}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Use Selected ({selectedFiles.length})
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete ({selectedFiles.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              Loading files...
            </div>
          )}

          {!isLoading && filteredFiles.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {searchQuery || selectedType ? 'No files match your search' : 'No files uploaded yet'}
            </div>
          )}

          {filteredFiles.length > 0 && (
            <div className="p-4">
              {/* Select All */}
              <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  {selectedFiles.length === filteredFiles.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  Select All ({filteredFiles.length})
                </button>
              </div>

              {/* File Grid */}
              <div className="grid grid-cols-1 gap-2">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedFiles.includes(file.id)
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <button
                      onClick={() => handleFileSelect(file)}
                      className="flex-shrink-0"
                    >
                      {selectedFiles.includes(file.id) ? (
                        <CheckSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>

                    {/* File icon and details */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getFileIcon(file.mimetype)}
                      <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.originalname || file.displayName || 'Unnamed File'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size || 0)} • {file.mimetype}
                      </div>
                      {file.expirationTime && (
                        <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires: {new Date(file.expirationTime).toLocaleString()}
                        </div>
                      )}
                      </div>
                    </div>

                    {/* Individual delete button */}
                    <button
                      onClick={() => handleSingleDelete(file.id)}
                      className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {filteredFiles.length} of {files.length} files
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
