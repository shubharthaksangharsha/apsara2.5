// backend/tools.js

// Import from gmail-tools.js
import { gmailToolSchemas, gmailToolHandlers } from './gmail-tools.js';
// Import from calendar-tools.js
import { calendarToolSchemas, calendarToolHandlers } from './calendar-tools.js';
// Import from maps-tools.js
import { mapsToolSchemas, mapsToolHandlers } from './maps-tools.js';

// --- Tool Schemas ---
const getCurrentTimeSchema = {
  name: 'getCurrentTime',
  description: 'Returns current server time in ISO format',
  parameters: {
    type: 'object',
    properties: {
      timezone: { type: 'string', description: 'Optional. Time zone ID (e.g. Asia/Adelaide)' }
    },
    required: []
  }
};

const echoSchema = {
  name: 'echo',
  description: 'Echoes the provided message',
  parameters: {
    type: 'object',
    properties: {
      message: { type: 'string' }
    },
    required: ['message']
  }
};

// NEW: Battery Tool Schema
const getBatteryStatusSchema = {
  name: 'getBatteryStatus',
  description: 'Gets the current battery level and charging status of the laptop hosting the server.',
  parameters: {
    type: 'object',
    properties: {}, // No parameters needed for this simple version
    required: []
  }
};

// --- NEW TOOL SCHEMAS ---


const getWeatherSchema = {
  name: 'getWeather',
  description: 'Gets the current weather information for a specified city.',
  parameters: {
    type: 'object',
    properties: {
      city: { type: 'string', description: 'The name of the city (e.g., "London").' },
      countryCode: { type: 'string', description: 'Optional. The two-letter ISO country code (e.g., "GB" for Great Britain).' },
      units: { type: 'string', enum: ['metric', 'imperial'], description: 'Optional. Units for temperature. Defaults to metric (Celsius).' }
    },
    required: ['city']
  }
};

const captureScreenshotSchema = {
  name: 'captureScreenshot',
  description: 'Captures a "screenshot" (placeholder for server-side action). In a real scenario, this might involve a headless browser or specific server utility.',
  parameters: {
    type: 'object',
    properties: {
      targetUrl: { type: 'string', description: 'Optional. If capturing a webpage, the URL to capture.' },
      fileName: { type: 'string', description: 'Optional. Suggested filename for the screenshot.' }
    },
    required: []
  }
};


// Array of tool schemas for Gemini configuration
// Combine imported schemas from all tool files
export const customToolDeclarations = [
  getCurrentTimeSchema,
  echoSchema,
  getBatteryStatusSchema,
  ...gmailToolSchemas, // Spread Gmail tool schemas
  ...calendarToolSchemas, // Spread Calendar tool schemas
  ...mapsToolSchemas, // Spread Maps tool schemas
  getWeatherSchema,
  captureScreenshotSchema,
];


// --- Tool Handlers ---

function handleGetCurrentTime({ timezone }) {
  // Basic implementation, could be enhanced with timezone libraries if needed
  return { time: new Date().toISOString() };
}

function handleEcho({ message }) {
  return { message: message ?? 'No message provided' };
}

// NEW: Battery Tool Handler (via Python)
// IMPORTANT: This is a placeholder. Real implementation requires OS-specific
// libraries (like 'node-powershell' on Windows, 'acpi' command on Linux,
// 'pmset' on macOS) or potentially a cross-platform library if available.
// Executing external commands can have security implications - ensure python path is safe.
async function handleGetBatteryStatus() {
  // Execute Python script to get battery status
  const { spawn } = await import('child_process'); // Dynamically import
  const pythonProcess = spawn('python', ['./get_battery.py']); // Adjust path if needed

  let dataOutput = '';
  let errorOutput = '';

  pythonProcess.stdout.on('data', (data) => {
    dataOutput += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  return new Promise((resolve, reject) => {
    pythonProcess.on('close', (code) => {
      console.log(`[Tool: getBatteryStatus] Python script stdout: ${dataOutput}`); // Log output
      console.error(`[Tool: getBatteryStatus] Python script stderr: ${errorOutput}`); // Log errors
      if (code !== 0 || errorOutput) {
        console.error(`[Tool: getBatteryStatus] Python script error (Code: ${code}): ${errorOutput}`);
        // Resolve with an error object for Gemini, DO NOT REJECT here as it breaks the tool call flow
        resolve({ error: `Python script execution failed: ${errorOutput || `Exit code ${code}`}` });
      } else {
        try {
          resolve(JSON.parse(dataOutput.trim() || '{}')); // Parse the JSON output, default to empty object if stdout is empty
        } catch (parseError) {
          console.error(`[Tool: getBatteryStatus] Error parsing Python output: ${parseError}`);
          resolve({ error: `Failed to parse battery status: ${dataOutput}` });
        }
      }
    });

    pythonProcess.on('error', (err) => {
      console.error(`[Tool: getBatteryStatus] Failed to spawn Python process: ${err}`);
      resolve({ error: `Could not start battery check process: ${err.message}` }); // Resolve with error for Gemini
    });
  });
}


async function handleGetWeather({ city, countryCode, units = 'metric' }) {
  console.log(`[Tool: getWeather] Request for weather: City: "${city}", Country: ${countryCode || 'N/A'}, Units: ${units}`);
  return {
    status: 'success',
    city: city,
    temperature: `20°${units === 'metric' ? 'C' : 'F'} (Mock Data)`,
    condition: 'Sunny (Mock Data)',
    humidity: '60% (Mock Data)'
  };
}

async function handleCaptureScreenshot({ targetUrl, fileName }) {
  console.log(`[Tool: captureScreenshot] Request to capture screenshot. Target: ${targetUrl || 'N/A'}, FileName: ${fileName || 'screenshot.png'}`);
  return {
    status: 'success',
    message: `Screenshot capture for "${targetUrl || 'desktop'}" logged. Real capture not implemented.`,
    filePath: `/path/to/mock/${fileName || 'screenshot.png'} (Mock Path)`
  };
}


// Map of tool names to their handler functions
// Combine imported handlers from all tool files
export const toolHandlers = {
  getCurrentTime: handleGetCurrentTime,
  echo: handleEcho,
  getBatteryStatus: handleGetBatteryStatus,
  ...gmailToolHandlers, // Spread Gmail handlers
  ...calendarToolHandlers, // Spread Calendar handlers
  ...mapsToolHandlers, // Spread Maps handlers
  getWeather: handleGetWeather,
  captureScreenshot: handleCaptureScreenshot,
};

// Export just the names for the system prompt
export const customToolNames = Object.keys(toolHandlers);
