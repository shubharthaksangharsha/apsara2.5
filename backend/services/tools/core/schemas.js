// services/tools/core/schemas.js
export const getCurrentTimeSchema = {
    name: 'getCurrentTime',
    description: 'Returns current server time in ISO format',
    parameters: {
      type: 'OBJECT',
      properties: {
        timezone: { type: 'STRING', description: 'Optional. Time zone ID (e.g. Asia/Adelaide)' }
      },
    }
  };
  
  export const echoSchema = {
    name: 'echo',
    description: 'Echoes the provided message',
    parameters: {
      type: 'OBJECT',
      properties: {
        message: { type: 'STRING', description: 'The message to echo. Optional.' }
      },
    }
  };
  
  export const getBatteryStatusSchema = {
    name: 'getBatteryStatus',
    description: 'Gets the current battery level and charging status of the laptop hosting the server.',
    parameters: {
      type: 'OBJECT',
      properties: {}, // No parameters needed for this simple version
    }
  };
  
  export const coreToolSchemas = [
    getCurrentTimeSchema,
    echoSchema,
    getBatteryStatusSchema
  ];