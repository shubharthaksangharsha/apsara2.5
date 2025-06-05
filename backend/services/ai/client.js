import { GoogleGenAI } from "@google/genai";

/**
 * Initializes and returns a Gemini API client
 * @returns {Promise<Object>} - Initialized Gemini client
 */
export async function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable not set');
  }
  return new GoogleGenAI({ apiKey });
}
