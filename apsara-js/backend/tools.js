// backend/tools.js

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

// Array of tool schemas for Gemini configuration
export const customToolDeclarations = [
  getCurrentTimeSchema,
  echoSchema,
  getBatteryStatusSchema
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


// Map of tool names to their handler functions
export const toolHandlers = {
  getCurrentTime: handleGetCurrentTime,
  echo: handleEcho,
  getBatteryStatus: handleGetBatteryStatus,
};

// Export just the names for the system prompt
export const customToolNames = Object.keys(toolHandlers);
