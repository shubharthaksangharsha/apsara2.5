// routes/files.js
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File upload configuration - temporary storage for processing
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB limit (Google's max)
    fieldSize: 100 * 1024 * 1024      // 100MB field size limit
  }
});

// Global array to track uploaded files (in-memory)
const uploadedFiles = [];

// Helper function to clean up temporary files
const cleanupTempFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Cleanup] Removed temporary file: ${filePath}`);
    }
  } catch (error) {
    console.warn(`[Cleanup] Failed to remove temporary file ${filePath}:`, error.message);
  }
};

// Upload a file
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required.' });
  
  console.log(`[POST /files] Received file: ${req.file.originalname}, size: ${req.file.size}, path: ${req.file.path}`);

  try {
    // Step 1: Upload to Google File API
    console.log(`[POST /files] Uploading "${req.file.originalname}" to Google File API...`);
    const googleFileResource = await req.app.get('ai').files.upload({
      file: req.file.path, // multer saves it to a temp path
      config: {
        displayName: req.file.originalname,
        mimeType: req.file.mimetype,
      },
    });

    console.log(`[POST /files] Google File API upload initiated. File Name: ${googleFileResource.name}, State: ${googleFileResource.state}`);

    // Step 2: Wait for the file to be processed (especially important for video files)
    let getFile = googleFileResource;
    let retries = 0;
    const maxRetries = 24; // Poll for up to 2 minutes (24 * 5s) for large files
    
    while (getFile.state === 'PROCESSING' && retries < maxRetries) {
      console.log(`[POST /files] File "${getFile.name}" is still PROCESSING. Retrying in 5 seconds... (Attempt ${retries + 1})`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      getFile = await req.app.get('ai').files.get({ name: getFile.name });
      retries++;
    }

    if (getFile.state === 'FAILED') {
      console.error(`[POST /files] Google File API processing FAILED for "${getFile.name}". Reason: ${getFile.error?.message || 'Unknown error'}`);
      // Clean up temp file before returning error
      cleanupTempFile(req.file.path);
      return res.status(500).json({ error: `File processing failed on Google's side: ${getFile.error?.message || 'Unknown error'}` });
    }

    if (getFile.state !== 'ACTIVE') {
      console.error(`[POST /files] File "${getFile.name}" did not become ACTIVE after ${retries} retries. Final state: ${getFile.state}`);
      // Clean up temp file before returning error
      cleanupTempFile(req.file.path);
      return res.status(500).json({ error: `File processing timed out or ended in an unexpected state: ${getFile.state}` });
    }

    console.log(`[POST /files] File "${getFile.name}" is ACTIVE. URI: ${getFile.uri}`);

    // Step 3: Create file metadata
    const fileMetadata = {
      id: getFile.name, // Google's file name is the unique ID (e.g., "files/...")
      originalname: req.file.originalname,
      mimetype: getFile.mimeType, // Use mimeType from Google's response
      size: parseInt(getFile.sizeBytes) || req.file.size, // Use Google's size if available
      uri: getFile.uri, // Crucial for creating fileData parts
      googleFileName: getFile.name, // Store the full Google file name
      state: getFile.state,
      uploadTimestamp: Date.now(),
      expirationTime: getFile.expirationTime, // Google's automatic cleanup time
      sha256Hash: getFile.sha256Hash, // File integrity hash
      displayName: getFile.displayName
    };
    
    uploadedFiles.push(fileMetadata);

    // Step 4: Clean up temporary file
    cleanupTempFile(req.file.path);

    res.json({ file: fileMetadata });

  } catch (error) {
    console.error('[POST /files] Error during file upload to Google or processing:', error);
    // Always clean up temp file on error
    cleanupTempFile(req.file.path);
    res.status(500).json({ error: error.message || 'Internal server error during file upload processing.' });
  }
});

// List all files
router.get('/', async (req, res) => {
  try {
    // Option to sync with Google Files API
    const { sync } = req.query;
    
    if (sync === 'true') {
      console.log('[GET /files] Syncing with Google Files API...');
      
      // Clear our in-memory list
      uploadedFiles.length = 0;
      
      // Fetch files from Google Files API
      const googleFilesList = await req.app.get('ai').files.list({ 
        config: { pageSize: 100 } 
      });
      
      // Convert Google files to our format
      for await (const googleFile of googleFilesList) {
        const fileMetadata = {
          id: googleFile.name,
          originalname: googleFile.displayName || 'Unknown File',
          mimetype: googleFile.mimeType,
          size: parseInt(googleFile.sizeBytes) || 0,
          uri: googleFile.uri,
          googleFileName: googleFile.name,
          state: googleFile.state,
          uploadTimestamp: new Date(googleFile.createTime).getTime(),
          expirationTime: googleFile.expirationTime,
          sha256Hash: googleFile.sha256Hash,
          displayName: googleFile.displayName
        };
        uploadedFiles.push(fileMetadata);
      }
      
      console.log(`[GET /files] Synced ${uploadedFiles.length} files from Google Files API`);
    }
    
    res.json({ files: uploadedFiles });
  } catch (error) {
    console.error('[GET /files] Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files', details: error.message });
  }
});

// Get file content
router.get('/content', async (req, res) => {
  try {
    // Extract file ID from query parameters
    const { fileId, uri } = req.query;
    
    if (!fileId && !uri) {
      return res.status(400).json({ error: 'Either fileId or uri parameter is required' });
    }
    
    let googleFileApiName;
    
    if (fileId) {
      // If direct fileId is provided
      googleFileApiName = fileId.startsWith('files/') ? fileId : `files/${fileId}`;
      console.log(`[GET /files/content] Fetching content for file: ${googleFileApiName}`);
    } else if (uri) {
      // If full URI is provided, extract the fileId from the end
      const uriParts = uri.split('/');
      const extractedId = uriParts[uriParts.length - 1];
      googleFileApiName = `files/${extractedId}`;
      console.log(`[GET /files/content] Extracted ID from URI: ${extractedId}`);
    }
    
    // Get file metadata first
    const fileMetadata = await req.app.get('ai').files.get({ name: googleFileApiName });
    
    if (!fileMetadata) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // For PDF and document files, we need to redirect to the Google Files API URI
    // The Google Files API doesn't provide direct binary content access via SDK
    // Instead, we redirect to the file's URI which is served by Google
    if (fileMetadata.uri) {
      console.log(`[GET /files/content] Redirecting to Google Files URI: ${fileMetadata.uri}`);
      return res.redirect(fileMetadata.uri);
    }
    
    // If no URI available, return error
    return res.status(404).json({ 
      error: 'File content not accessible', 
      details: 'File URI not available from Google Files API' 
    });
    
  } catch (error) {
    console.error('[GET /files/content] Error fetching file content:', error);
    res.status(500).json({ 
      error: 'Error fetching file content',
      details: error.message,
      code: error.code
    });
  }
});

// Delete a file
router.delete('/:fileId', async (req, res) => {
  const fileId = req.params.fileId; // This will be the Google File API name, e.g., "files/xxxxxxxx"
  console.log(`[DELETE /files] Request to delete file with Google Name: ${fileId}`);

  if (!fileId) {
    return res.status(400).json({ error: 'File ID (Google File Name) is required.' });
  }

  try {
    // Attempt to delete from Google File API
    // The name needs to be in the format "files/FILE_ID_PART"
    const googleFileApiName = fileId.startsWith('files/') ? fileId : `files/${fileId}`;
    
    console.log(`[DELETE /files] Attempting to delete from Google File API: ${googleFileApiName}`);
    await req.app.get('ai').files.delete({ name: googleFileApiName });
    console.log(`[DELETE /files] Successfully deleted file ${googleFileApiName} from Google File API.`);

    // Remove from our in-memory list
    const initialLength = uploadedFiles.length;
    // We stored googleFileName as the unique ID from Google.
    const fileIndex = uploadedFiles.findIndex(f => f.googleFileName === googleFileApiName || f.id === googleFileApiName); 
    
    if (fileIndex > -1) {
      uploadedFiles.splice(fileIndex, 1);
      console.log(`[DELETE /files] Removed file ${googleFileApiName} from server's in-memory list. New count: ${uploadedFiles.length}`);
    } else {
      console.warn(`[DELETE /files] File ${googleFileApiName} was deleted from Google, but not found in server's in-memory list.`);
    }

    res.status(200).json({ message: `File ${googleFileApiName} deleted successfully.` });

  } catch (error) {
    console.error(`[DELETE /files] Error deleting file ${fileId}:`, error);
    // Google API might throw an error if the file doesn't exist, which is fine.
    if (error.message && error.message.includes('not found')) {
        // If Google says not found, but we might still have it in our list, try removing from list.
        const fileIndex = uploadedFiles.findIndex(f => f.googleFileName === fileId || f.id === fileId);
        if (fileIndex > -1) {
            uploadedFiles.splice(fileIndex, 1);
            console.log(`[DELETE /files] File ${fileId} not found on Google (perhaps already deleted), removed from server list.`);
            return res.status(200).json({ message: `File ${fileId} was already deleted from Google or not found, removed from local list.` });
        }
        return res.status(404).json({ error: `File ${fileId} not found on Google File API.` });
    }
    res.status(500).json({ error: error.message || 'Internal server error during file deletion.' });
  }
});

// Get file metadata from Google Files API
router.get('/:fileId/info', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const googleFileApiName = fileId.startsWith('files/') ? fileId : `files/${fileId}`;
    
    console.log(`[GET /files/:fileId/info] Fetching metadata for: ${googleFileApiName}`);
    
    const fileMetadata = await req.app.get('ai').files.get({ name: googleFileApiName });
    
    res.json({
      file: {
        id: fileMetadata.name,
        originalname: fileMetadata.displayName || 'Unknown File',
        mimetype: fileMetadata.mimeType,
        size: parseInt(fileMetadata.sizeBytes) || 0,
        uri: fileMetadata.uri,
        googleFileName: fileMetadata.name,
        state: fileMetadata.state,
        createTime: fileMetadata.createTime,
        updateTime: fileMetadata.updateTime,
        expirationTime: fileMetadata.expirationTime,
        sha256Hash: fileMetadata.sha256Hash,
        displayName: fileMetadata.displayName
      }
    });
  } catch (error) {
    console.error(`[GET /files/:fileId/info] Error fetching file metadata:`, error);
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(500).json({ error: 'Failed to fetch file metadata', details: error.message });
  }
});

// Count tokens for a file
router.post('/tokens', async (req, res) => {
  const { fileId, mimeType, size } = req.body;
  
  if (!fileId) {
    return res.status(400).json({ error: 'File ID required' });
  }

  console.log(`[POST /files/tokens] Counting tokens for file: ${fileId}`);

  try {
    // Find the file in our uploaded files list
    const file = uploadedFiles.find(f => f.googleFileName === fileId || f.id === fileId);
    
    if (!file) {
      console.log(`[POST /files/tokens] File not found in uploaded files, using estimation`);
      // If file not found, return estimation based on type and size
      const estimatedTokens = getEstimatedTokenCount(mimeType, size);
      return res.json({ tokenCount: estimatedTokens });
    }

    // Try to get accurate token count from Gemini API
    try {
      const ai = req.app.get('ai');
      const contents = [{
        inlineData: {
          mimeType: file.mimetype,
          data: file.googleFileUri // Use the Google file URI
        }
      }];

      const countResponse = await ai.models.countTokens({
        model: 'gemini-2.0-flash',
        contents: contents
      });

      console.log(`[POST /files/tokens] Gemini API token count: ${countResponse.totalTokens}`);
      res.json({ tokenCount: countResponse.totalTokens });
      
    } catch (geminiError) {
      console.warn(`[POST /files/tokens] Gemini API error, using estimation:`, geminiError.message);
      const estimatedTokens = getEstimatedTokenCount(mimeType, size);
      res.json({ tokenCount: estimatedTokens });
    }

  } catch (error) {
    console.error(`[POST /files/tokens] Error counting tokens:`, error);
    const estimatedTokens = getEstimatedTokenCount(mimeType || 'application/octet-stream', size || 0);
    res.json({ tokenCount: estimatedTokens });
  }
});

// Helper function for token estimation when API is unavailable
function getEstimatedTokenCount(mimeType = '', size = 0) {
  const sizeKB = size / 1024;

  // According to Gemini API documentation:
  if (mimeType === 'application/pdf') {
    // Each document page is equivalent to 258 tokens
    // Rough estimate: 1KB ≈ 6 tokens for PDF content
    return Math.round(sizeKB * 6);
  }

  if (mimeType.startsWith('image/')) {
    // Images: 258 tokens minimum (for small images <=384px)
    // Larger images are tiled at 768x768, each tile = 258 tokens
    return 258; // Base token count
  }

  if (mimeType.startsWith('video/')) {
    // Video: 263 tokens per second
    // Estimate duration from file size: ~1MB per minute
    const estimatedMinutes = sizeKB / 1024;
    return Math.round(estimatedMinutes * 60 * 263);
  }

  if (mimeType.startsWith('audio/')) {
    // Audio: 32 tokens per second
    // Estimate duration from file size: ~1MB per minute
    const estimatedMinutes = sizeKB / 1024;
    return Math.round(estimatedMinutes * 60 * 32);
  }

  if (mimeType.startsWith('text/')) {
    // Text files: ~200 tokens per KB
    return Math.round(sizeKB * 200);
  }

  // Default estimation
  return Math.round(sizeKB * 4);
}

export { uploadedFiles };
export default router;