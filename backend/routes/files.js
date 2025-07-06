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

// File upload configuration
const upload = multer({ dest: 'uploads/' });
// Global array to track uploaded files
const uploadedFiles = [];

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

    // Step 2: Wait for the file to be processed
    let getFile = googleFileResource;
    let retries = 0;
    const maxRetries = 12; // Poll for up to 60 seconds (12 * 5s)
    
    while (getFile.state === 'PROCESSING' && retries < maxRetries) {
      console.log(`[POST /files] File "${getFile.name}" is still PROCESSING. Retrying in 5 seconds... (Attempt ${retries + 1})`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      getFile = await req.app.get('ai').files.get({ name: getFile.name });
      retries++;
    }

    if (getFile.state === 'FAILED') {
      console.error(`[POST /files] Google File API processing FAILED for "${getFile.name}". Reason: ${getFile.error?.message || 'Unknown error'}`);
      return res.status(500).json({ error: `File processing failed on Google's side: ${getFile.error?.message || 'Unknown error'}` });
    }

    if (getFile.state !== 'ACTIVE') {
      console.error(`[POST /files] File "${getFile.name}" did not become ACTIVE after ${retries} retries. Final state: ${getFile.state}`);
      return res.status(500).json({ error: `File processing timed out or ended in an unexpected state: ${getFile.state}` });
    }

    console.log(`[POST /files] File "${getFile.name}" is ACTIVE. URI: ${getFile.uri}`);

    const fileMetadata = {
      id: getFile.name, // Google's file name is the unique ID (e.g., "files/...")
      originalname: req.file.originalname,
      mimetype: getFile.mimeType, // Use mimeType from Google's response
      size: req.file.size, // Original size from multer
      uri: getFile.uri, // Crucial for creating fileData parts
      googleFileName: getFile.name, // Store the full Google file name
      state: getFile.state,
      uploadTimestamp: Date.now()
    };
    
    uploadedFiles.push(fileMetadata);

    res.json({ file: fileMetadata });

  } catch (error) {
    console.error('[POST /files] Error during file upload to Google or processing:', error);
    res.status(500).json({ error: error.message || 'Internal server error during file upload processing.' });
  }
});

// List all files
router.get('/', (req, res) => res.json({ files: uploadedFiles }));

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
    
    // Get file content from Google File API
    const fileContent = await req.app.get('ai').files.getContent({ name: googleFileApiName });
    
    if (!fileContent || !fileContent.data) {
      return res.status(404).json({ error: 'File content not found' });
    }
    
    // Get file metadata to determine content type
    const fileMetadata = await req.app.get('ai').files.get({ name: googleFileApiName });
    
    // Set appropriate content type
    res.set('Content-Type', fileMetadata.mimeType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${fileMetadata.displayName || 'file'}"`); 
    
    // Send binary data directly
    res.send(Buffer.from(fileContent.data));
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

export { uploadedFiles };
export default router;