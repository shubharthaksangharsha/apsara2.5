// backend/routes/codeFiles.js
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import multer from 'multer';

const router = express.Router();
const FILE_STORAGE_PATH = path.join(process.cwd(), 'uploads/code');

const FILE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const fileExpirations = new Map(); // In-memory store of file expirations

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const sessionId = req.params.sessionId || req.body.sessionId;
    const sessionPath = path.join(FILE_STORAGE_PATH, sessionId);
    try {
      await fs.mkdir(sessionPath, { recursive: true });
      cb(null, sessionPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

// List files in a session
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const sessionPath = path.join(FILE_STORAGE_PATH, req.params.sessionId);
    const files = await fs.readdir(sessionPath);
    
    const fileDetails = await Promise.all(
      files.map(async (file) => {
        const stats = await fs.stat(path.join(sessionPath, file));
        const fileKey = `${req.params.sessionId}/${file}`;
        
        // Set expiration if not already set
        if (!fileExpirations.has(fileKey)) {
          fileExpirations.set(fileKey, Date.now() + FILE_EXPIRATION_MS);
        }
        
        const expiresAt = fileExpirations.get(fileKey);
        
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime,
          downloadUrl: `/api/code/files/${req.params.sessionId}/${file}`,
          expiresAt: new Date(expiresAt).toISOString(),
          expiresIn: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)) // seconds remaining
        };
      })
    );
    
    res.json(fileDetails);
  } catch (error) {
    res.status(404).json({ error: 'Session not found' });
  }
});

// Upload file to a session
router.post('/sessions/:sessionId/upload', upload.single('file'), (req, res) => {
  res.json({
    success: true,
    file: {
      name: req.file.originalname,
      downloadUrl: `/api/code/files/${req.params.sessionId}/${req.file.originalname}`
    }
  });
});

// Download file from a session
router.get('/files/:sessionId/:filename', async (req, res) => {
  const fileKey = `${req.params.sessionId}/${req.params.filename}`;
  const filePath = path.join(FILE_STORAGE_PATH, req.params.sessionId, req.params.filename);
  
  try {
    // Check if file exists
    await fs.access(filePath);
    
    // Set expiration if not already set (or reset it to extend access time)
    fileExpirations.set(fileKey, Date.now() + FILE_EXPIRATION_MS);
    const expiresAt = fileExpirations.get(fileKey);
    
    console.log("expiresAt", new Date(expiresAt).toISOString());
    console.log("Date.now()", new Date(Date.now()).toISOString());
    console.log("expiresAt > Date.now()", expiresAt > Date.now());
    
    // File should never be expired at this point since we just set it
    res.download(filePath);
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

export default router;
