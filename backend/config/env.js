// config/env.js
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check for API keys - use GOOGLE_API_KEY as fallback if GEMINI_API_KEY is not available
let apiKey;
if (process.env.GEMINI_API_KEY) {
  apiKey = process.env.GEMINI_API_KEY;
} else if (process.env.GOOGLE_API_KEY) {
  console.log('Using GOOGLE_API_KEY as fallback for GEMINI_API_KEY');
  apiKey = process.env.GOOGLE_API_KEY;
} else {
  throw new Error('Neither GEMINI_API_KEY nor GOOGLE_API_KEY environment variable is set.');
}

export const PORT = process.env.PORT || 9000;
export const GEMINI_API_KEY = apiKey;
export const NODE_ENV = process.env.NODE_ENV;
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
