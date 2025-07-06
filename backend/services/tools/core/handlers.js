// services/tools/core/handlers.js
/**
 * Returns the current server time
 */
export function handleGetCurrentTime({ timezone }) {
    // Basic implementation, could be enhanced with timezone libraries if needed
    return { time: new Date().toISOString() };
  }
  
  /**
   * Echoes back the provided message
   */
  export function handleEcho({ message }) {
    return { message: message ?? 'No message provided' };
  }
  
  /**
   * Gets the battery status via Python script
   */
  export async function handleGetBatteryStatus() {
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
  
  export const coreToolHandlers = {
    getCurrentTime: handleGetCurrentTime,
    echo: handleEcho,
    getBatteryStatus: handleGetBatteryStatus
  };