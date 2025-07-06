/**
 * Frontend utility for handling file type support
 */

// File types that are NOT supported by Gemini API
export const UNSUPPORTED_FILE_TYPES = new Set([
  // Microsoft Office documents
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/msword', // .doc
  'application/vnd.ms-excel', // .xls
  'application/vnd.ms-powerpoint', // .ppt
  
  // Other common unsupported types
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/x-gzip',
  'application/octet-stream',
  'application/x-executable',
  'application/x-sharedlib',
  'application/x-dosexec'
]);

// Gemini API supported file types
export const GEMINI_SUPPORTED_FILE_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif',

  // Documents
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/html',
  'text/markdown',
  'text/x-python',
  'text/x-java-source',
  'text/x-c',
  'text/x-c++',
  'text/javascript',
  'text/typescript',
  'application/json',
  'application/xml',
  'text/xml',

  // Audio
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/flac',
  'audio/ogg',
  'audio/webm',

  // Video
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo' // .avi
]);

/**
 * Check if a file type is supported by Gemini API
 * @param {string} mimeType - The MIME type to check
 * @returns {boolean} - True if supported, false otherwise
 */
export function isGeminiSupported(mimeType) {
  if (!mimeType) return false;
  
  // Check if explicitly supported
  if (GEMINI_SUPPORTED_FILE_TYPES.has(mimeType)) {
    return true;
  }
  
  // Check if explicitly unsupported
  if (UNSUPPORTED_FILE_TYPES.has(mimeType)) {
    return false;
  }
  
  // For unknown types, allow text/* types but block others
  if (mimeType.startsWith('text/')) {
    return true;
  }
  
  // Conservative approach: block unknown types
  return false;
}

/**
 * Get user-friendly file type name
 * @param {string} mimeType - The MIME type
 * @returns {string} - User-friendly name
 */
export function getFileTypeName(mimeType) {
  const typeMap = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document (.docx)',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet (.xlsx)',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Presentation (.pptx)',
    'application/msword': 'Word Document (.doc)',
    'application/vnd.ms-excel': 'Excel Spreadsheet (.xls)',
    'application/vnd.ms-powerpoint': 'PowerPoint Presentation (.ppt)',
    'application/pdf': 'PDF Document',
    'text/plain': 'Text File',
    'image/jpeg': 'JPEG Image',
    'image/png': 'PNG Image',
    'image/webp': 'WebP Image',
    'image/gif': 'GIF Image',
    'video/mp4': 'MP4 Video',
    'audio/mp3': 'MP3 Audio',
    'audio/wav': 'WAV Audio'
  };
  
  return typeMap[mimeType] || mimeType;
}
