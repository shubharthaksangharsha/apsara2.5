// backend/tools.js

// Import from gmail-tools.js
import { gmailToolSchemas, gmailToolHandlers } from './gmail-tools.js';
// Import from calendar-tools.js
import { calendarToolSchemas, calendarToolHandlers } from './calendar-tools.js';
// Import from maps-tools.js
import { mapsToolSchemas, mapsToolHandlers } from './maps-tools.js';
import fetch from 'node-fetch'; // Ensure fetch is available (used by maps-tools.js as well)

// --- Tool Schemas ---
const getCurrentTimeSchema = {
  name: 'getCurrentTime',
  description: 'Returns current server time in ISO format',
  parameters: {
    type: 'OBJECT',
    properties: {
      timezone: { type: 'STRING', description: 'Optional. Time zone ID (e.g. Asia/Adelaide)' }
    },
    // required: [] // Commented out
  }
};

const echoSchema = {
  name: 'echo',
  description: 'Echoes the provided message',
  parameters: {
    type: 'OBJECT',
    properties: {
      message: { type: 'STRING', description: 'The message to echo. Optional.' }
    },
    // required: ['message'] // Commented out
  }
};

// NEW: Battery Tool Schema
const getBatteryStatusSchema = {
  name: 'getBatteryStatus',
  description: 'Gets the current battery level and charging status of the laptop hosting the server.',
  parameters: {
    type: 'OBJECT',
    properties: {}, // No parameters needed for this simple version
    // required: [] // Commented out
  }
};

// --- NEW TOOL SCHEMAS ---


const getWeatherSchema = {
  name: 'getWeather',
  description: 'Gets the current weather information for a specified city.',
  parameters: {
    type: 'OBJECT',
    properties: {
      city: { type: 'STRING', description: 'The name of the city (e.g., "London"). This is essential.' },
      countryCode: { type: 'STRING', description: 'Optional. The two-letter ISO country code (e.g., "GB" for Great Britain) to make the city search more specific.' },
      units: { type: 'STRING', enum: ['metric', 'imperial'], description: 'Optional. Units for temperature. "metric" for Celsius, "imperial" for Fahrenheit. Defaults to metric.' }
    },
    // required: ['city'] // Commented out, but handler will check for city
  }
};

const captureScreenshotSchema = {
  name: 'captureScreenshot',
  description: 'Captures a "screenshot" (placeholder for server-side action). In a real scenario, this might involve a headless browser or specific server utility.',
  parameters: {
    type: 'OBJECT',
    properties: {
      targetUrl: { type: 'STRING', description: 'Optional. If capturing a webpage, the URL to capture.' },
      fileName: { type: 'STRING', description: 'Optional. Suggested filename for the screenshot.' }
    },
    // required: [] // Commented out
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
  if (!city) {
    return { status: 'error', message: 'City is required to get weather information.' };
  }

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    console.error("[Tool: getWeather] OpenWeatherMap API key not found in process.env.OPENWEATHERMAP_API_KEY.");
    return { status: 'error', message: 'Weather service API key is not configured on the server.' };
  }

  let query = city;
  if (countryCode) {
    query += `,${countryCode}`;
  }

  const OWM_UNITS = (units === 'imperial') ? 'imperial' : 'metric'; // OpenWeatherMap uses 'metric' or 'imperial'
  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${apiKey}&units=${OWM_UNITS}`;

  console.log(`[Tool: getWeather] Requesting weather for: "${query}", Units: ${OWM_UNITS}. API URL: ${apiUrl}`);

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (response.status !== 200 || data.cod !== 200) { // data.cod is OpenWeatherMap's status code
      console.error('[Tool: getWeather] OpenWeatherMap API Error:', data);
      const errorMessage = data.message || `Weather API Error (HTTP ${response.status}, OWM Code ${data.cod || 'N/A'})`;
      return { status: 'error', message: errorMessage };
    }

    const tempUnit = OWM_UNITS === 'metric' ? '°C' : '°F';
    const windSpeedUnit = OWM_UNITS === 'metric' ? 'm/s' : 'mph';

    // Prepare data for AI and potential GUI
    const weatherResult = {
      status: 'success',
      location: data.name + (data.sys?.country ? `, ${data.sys.country}` : ''),
      temperature: `${Math.round(data.main.temp)}${tempUnit}`,
      feels_like: `${Math.round(data.main.feels_like)}${tempUnit}`,
      min_temperature: `${Math.round(data.main.temp_min)}${tempUnit}`,
      max_temperature: `${Math.round(data.main.temp_max)}${tempUnit}`,
      condition: data.weather[0]?.main || 'N/A',
      description: data.weather[0]?.description || 'N/A',
      humidity: `${data.main.humidity}%`,
      pressure: `${data.main.pressure} hPa`,
      wind_speed: `${data.wind.speed} ${windSpeedUnit}`,
      wind_direction: data.wind.deg, // degrees
      clouds: `${data.clouds?.all || 0}%`,
      visibility: data.visibility, // meters
      sunrise: data.sys?.sunrise ? new Date(data.sys.sunrise * 1000).toLocaleTimeString() : 'N/A',
      sunset: data.sys?.sunset ? new Date(data.sys.sunset * 1000).toLocaleTimeString() : 'N/A',
      icon_code: data.weather[0]?.icon, // e.g., "01d" for clear sky day
      icon_url: data.weather[0]?.icon ? `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png` : null,
      // Data specifically for a richer GUI display on the frontend
      _weatherGUIData: {
        city: data.name,
        country: data.sys?.country,
        temp_numeric: data.main.temp,
        temp_unit_char: tempUnit.charAt(1), // 'C' or 'F'
        condition_main: data.weather[0]?.main,
        condition_description: data.weather[0]?.description,
        icon: data.weather[0]?.icon, // e.g. "01d"
        humidity_percent: data.main.humidity,
        wind_speed_numeric: data.wind.speed,
        wind_speed_unit_text: windSpeedUnit,
        // You can add more structured data here as needed for UI components
      }
    };
    console.log(`[Tool: getWeather] Successfully fetched weather for "${weatherResult.location}": ${weatherResult.condition}, ${weatherResult.temperature}`);
    return weatherResult;

  } catch (error) {
    console.error('[Tool: getWeather] Error fetching or processing weather data:', error);
    return { status: 'error', message: `Failed to get weather data: ${error.message}` };
  }
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
