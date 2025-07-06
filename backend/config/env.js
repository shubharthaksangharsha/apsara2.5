// config/env.js
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate critical environment variables
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable not set.');
}

export const PORT = process.env.PORT || 9000;
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const NODE_ENV = process.env.NODE_ENV;
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';