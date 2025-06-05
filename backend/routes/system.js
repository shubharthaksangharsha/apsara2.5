// routes/system.js
import express from 'express';
import { availableVoices, getDefaultSystemInstruction } from '../config/ai.js';

const router = express.Router();

// Keep a reference to the current system settings
let currentSystemInstruction = getDefaultSystemInstruction();
let currentVoice = availableVoices[0];

// Get system instruction
router.get('/', (req, res) => res.json({ systemInstruction: currentSystemInstruction }));

// Update system instruction
router.post('/', (req, res) => {
  const { instruction } = req.body;
  if (!instruction) return res.status(400).json({ error: 'Instruction required.' });
  currentSystemInstruction = instruction;
  res.json({ updatedInstruction: currentSystemInstruction });
});

// Get available voices
router.get('/voices', (req, res) => res.json({ voices: availableVoices }));

// Select voice
router.post('/voices/select', (req, res) => {
  const { voiceName } = req.body;
  if (!availableVoices.includes(voiceName)) return res.status(400).json({ error: 'Invalid voice name.' });
  currentVoice = voiceName;
  res.json({ selectedVoice: currentVoice });
});

export { currentSystemInstruction, currentVoice };
export default router;