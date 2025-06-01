// backend/tools.js

// Import from gmail-tools.js
import { gmailToolSchemas, gmailToolHandlers } from './gmail-tools.js';
// Import from calendar-tools.js
import { calendarToolSchemas, calendarToolHandlers } from './calendar-tools.js';
// Import from maps-tools.js
import { mapsToolSchemas, mapsToolHandlers } from './maps-tools.js';
import fetch from 'node-fetch'; // Ensure fetch is available (used by maps-tools.js as well)

// Tool declarations will be defined at the end of the file

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
  description: 'Captures a screenshot of the current screen or a specific window. The screenshot will be displayed to the user.',
  parameters: {
    type: 'OBJECT',
    properties: {
      description: { type: 'STRING', description: 'Optional. A brief description or title for the screenshot.' },
      selector: { type: 'STRING', description: 'Optional. A CSS selector to capture a specific element (e.g., "#map-container").' }
    }
  }
};

// New tool for switching tabs in the UI
const switchTabSchema = {
  name: 'switchTab',
  description: 'Switches the active tab in the UI to the specified tab. Use this to help the user navigate between different views in the interface.',
  parameters: {
    type: 'OBJECT',
    properties: {
      tab: { 
        type: 'STRING', 
        description: 'The tab to switch to.', 
        enum: ['chat', 'code', 'map', 'calendar', 'weather'] 
      }
    },
    required: ['tab']
  }
};

// New tool for taking notes
const takeNotesSchema = {
  name: 'takeNotes',
  description: 'Saves user notes to a file. The notes will be saved to "my-imp-notes.txt" for future reference.',
  parameters: {
    type: 'OBJECT',
    properties: {
      content: { 
        type: 'STRING', 
        description: 'The content of the note to save. Can include any text, including code snippets, lists, etc.' 
      },
      title: { 
        type: 'STRING', 
        description: 'Optional. A title or header for the note.' 
      }
    },
    // required: ['content']
  }
};

// New tool for loading saved notes
const loadNotesSchema = {
  name: 'loadNotes',
  description: 'Loads previously saved notes from the notes file.',
  parameters: {
    type: 'OBJECT',
    properties: {
      limit: { 
        type: 'NUMBER', 
        description: 'Optional. Maximum number of notes to retrieve. Defaults to all notes.' 
      }
    }
  }
};

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

async function handleCaptureScreenshot({ description, selector }) {
  console.log(`[Tool: captureScreenshot] Request to capture screenshot. Description: ${description || 'N/A'}, Selector: ${selector || 'N/A'}`);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `screenshot-${timestamp}.png`;
  
  // Instead of actually capturing here (which would require native OS access),
  // we'll send an action to the frontend to handle the capture
  return {
    status: 'success',
    message: `Screenshot requested for "${description || 'current screen'}"`,
    action: 'captureScreenshot',
    description: description || 'Screenshot',
    selector: selector || null,
    timestamp: Date.now(),
    filename: filename
  };
}

// Handler for switching tabs in the UI
function handleSwitchTab({ tab }) {
  if (!tab) {
    return { 
      status: 'error', 
      message: 'Tab name is required.' 
    };
  }
  
  const validTabs = ['chat', 'code', 'map', 'calendar', 'weather'];
  if (!validTabs.includes(tab)) {
    return { 
      status: 'error', 
      message: `Invalid tab name: ${tab}. Valid options are: ${validTabs.join(', ')}` 
    };
  }
  
  console.log(`[Tool: switchTab] Switching UI tab to: ${tab}`);
  
  // This action will be handled by the frontend through websocket communication
  return { 
    status: 'success', 
    message: `UI tab switched to "${tab}"`, 
    tab: tab, 
    action: 'switchTab'  // This will be used by the frontend to identify the action
  };
}

// Handler for taking notes
async function handleTakeNotes({ content, title }) {
  if (!content) {
    return { 
      status: 'error', 
      message: 'Note content is required.' 
    };
  }
  
  console.log(`[Tool: takeNotes] Saving note${title ? ` titled "${title}"` : ''}`);
  
  try {
    // Format the note with timestamp and title if provided
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const formattedNote = `\n\n--- ${timestamp} ${title ? `- ${title}` : ''} ---\n${content}`;
    
    // Use Python to append the note to the file
    const pythonCode = `
import os

# File to save notes to
notes_file = 'my-imp-notes.txt'

# Note content to append
note_content = '''${formattedNote}'''

# Create the file if it doesn't exist or append to it
with open(notes_file, 'a+') as f:
    f.write(note_content)

# Verify file exists and get its size
file_exists = os.path.exists(notes_file)
file_size = os.path.getsize(notes_file) if file_exists else 0

print(f"Note saved successfully to {notes_file}. File size: {file_size} bytes.")
`;

    // Run the Python code
    const { spawn } = await import('child_process');
    const pythonProcess = spawn('python3', ['-c', pythonCode]);
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    return new Promise((resolve) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0 || errorOutput) {
          console.error(`[Tool: takeNotes] Error executing Python (Code: ${code}): ${errorOutput}`);
          resolve({
            status: 'error',
            message: `Failed to save note: ${errorOutput || `Exit code ${code}`}`
          });
        } else {
          console.log(`[Tool: takeNotes] Python output: ${output}`);
          resolve({
            status: 'success',
            message: `Note ${title ? `titled "${title}" ` : ''}saved successfully to my-imp-notes.txt`,
            action: 'notesSaved',
            output: output.trim()
          });
        }
      });
    });
  } catch (error) {
    console.error(`[Tool: takeNotes] Error: ${error.message}`);
    return {
      status: 'error',
      message: `Failed to save note: ${error.message}`
    };
  }
}

// Handler for loading saved notes
async function handleLoadNotes({ limit }) {
  console.log(`[Tool: loadNotes] Loading notes${limit ? ` (limit: ${limit})` : ''}`);
  
  try {
    // Use Python to read the notes file
    const pythonCode = `
import os

# File to read notes from
notes_file = 'my-imp-notes.txt'

# Check if file exists
if not os.path.exists(notes_file):
    print(json.dumps({
        "status": "error",
        "message": "No saved notes found. Use the takeNotes tool to save notes first."
    }))
    exit(0)

# Read the file content
with open(notes_file, 'r') as f:
    content = f.read()

# Get file stats
file_stats = os.stat(notes_file)
file_size = file_stats.st_size
last_modified = file_stats.st_mtime

import json
import time
from datetime import datetime

# Extract notes by splitting on the timestamp markers
# Each note starts with "--- YYYY-MM-DD HH:MM:SS"
notes = []
if content.strip():
    # Split by the marker pattern
    import re
    note_pattern = r'---\\s+(\\d{4}-\\d{2}-\\d{2}\\s+\\d{2}:\\d{2}:\\d{2})(?:\\s+-\\s+(.+?))?\\s+---\\n([\\s\\S]+?)(?=\\n\\n---\\s+\\d{4}|$)'
    matches = re.findall(note_pattern, content)
    
    for match in matches:
        timestamp, title, note_content = match
        notes.append({
            "timestamp": timestamp,
            "title": title.strip() if title else None,
            "content": note_content.strip()
        })

# Reverse so newest are first
notes.reverse()

# Apply limit if specified
limit_val = ${limit || 'None'}
if limit_val is not None and limit_val > 0:
    notes = notes[:limit_val]

# Prepare result
result = {
    "status": "success",
    "notes": notes,
    "total_notes": len(notes),
    "file_size": file_size,
    "last_modified": datetime.fromtimestamp(last_modified).isoformat()
}

print(json.dumps(result))
`;

    // Run the Python code
    const { spawn } = await import('child_process');
    const pythonProcess = spawn('python3', ['-c', pythonCode]);
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    return new Promise((resolve) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0 || errorOutput) {
          console.error(`[Tool: loadNotes] Error executing Python (Code: ${code}): ${errorOutput}`);
          resolve({
            status: 'error',
            message: `Failed to load notes: ${errorOutput || `Exit code ${code}`}`
          });
        } else {
          console.log(`[Tool: loadNotes] Python output: ${output}`);
          try {
            const result = JSON.parse(output.trim());
            resolve({
              ...result,
              action: 'notesLoaded'
            });
          } catch (parseError) {
            console.error(`[Tool: loadNotes] Error parsing Python output: ${parseError}`);
            resolve({
              status: 'error',
              message: `Failed to parse notes data: ${parseError.message}`
            });
          }
        }
      });
    });
  } catch (error) {
    console.error(`[Tool: loadNotes] Error: ${error.message}`);
    return {
      status: 'error',
      message: `Failed to load notes: ${error.message}`
    };
  }
}

// Map of tool names to their handler functions
// Combine imported handlers from all tool files
export const toolHandlers = {
  getCurrentTime: handleGetCurrentTime,
  echo: handleEcho,
  getBatteryStatus: handleGetBatteryStatus,
  ...gmailToolHandlers, // Spread Gmail handlers
  ...calendarToolHandlers, // Spread Calendar handlers
  // Maps handlers removed due to billing issues
  getWeather: handleGetWeather,
  switchTab: handleSwitchTab,
  takeNotes: handleTakeNotes,
  loadNotes: handleLoadNotes
};

// --- Define Tool Set ---
// Base tool declarations (available without authentication)
const baseToolDeclarations = [
  getCurrentTimeSchema,
  echoSchema,
  getBatteryStatusSchema,
  getWeatherSchema,
  switchTabSchema,
  takeNotesSchema,
  loadNotesSchema,
];

// Google-specific tool declarations (require authentication)
const googleToolDeclarations = [
  ...gmailToolSchemas,
  ...calendarToolSchemas,
  // Maps schemas removed due to billing issues
];

// Default tool declarations with all tools included
export const customToolDeclarations = [
  ...baseToolDeclarations,
  ...googleToolDeclarations,
];

// Function to get tool declarations based on authentication status
export const getToolDeclarations = (isAuthenticated = false) => {
  if (isAuthenticated) {
    return customToolDeclarations;
  } else {
    return baseToolDeclarations;
  }
};

// Export just the names for the system prompt
export const customToolNames = Object.keys(toolHandlers);
