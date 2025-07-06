// services/tools/ui/schemas.js
export const captureScreenshotSchema = {
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
  
  export const switchTabSchema = {
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
  
  export const generateImageSchema = {
    name: 'generateImage',
    description: 'Generates an image based on a text prompt using AI. The generated image will be displayed to the user along with descriptive text.',
    parameters: {
      type: 'OBJECT',
      properties: {
        prompt: { 
          type: 'STRING', 
          description: 'Detailed description of the image to generate. Be specific and descriptive for best results.' 
        }
      },
      required: ['prompt']
    }
  };
  
  export const editImageSchema = {
    name: 'editImage',
    description: 'Edits an existing image based on a text prompt. This can modify the last generated or uploaded image.',
    parameters: {
      type: 'OBJECT',
      properties: {
        prompt: { 
          type: 'STRING', 
          description: 'Detailed description of the edits to apply to the image.' 
        },
        imageId: {
          type: 'STRING',
          description: 'Optional. ID of the image to edit. If not provided, the most recent image will be used.'
        }
      },
      required: ['prompt']
    }
  };
  
  // Parallel Function Calling Demo Tools
  export const powerDiscoBallSchema = {
    name: 'powerDiscoBall',
    description: 'Powers the spinning disco ball on or off. Great for party atmosphere!',
    parameters: {
      type: 'OBJECT',
      properties: {
        power: { 
          type: 'BOOLEAN', 
          description: 'Whether to turn the disco ball on or off.' 
        }
      },
      required: ['power']
    }
  };
  
  export const startMusicSchema = {
    name: 'startMusic',
    description: 'Play some music matching the specified parameters. Perfect for setting the mood!',
    parameters: {
      type: 'OBJECT',
      properties: {
        energetic: { 
          type: 'BOOLEAN', 
          description: 'Whether the music is energetic or not.' 
        },
        loud: { 
          type: 'BOOLEAN', 
          description: 'Whether the music is loud or not.' 
        }
      },
      required: ['energetic', 'loud']
    }
  };
  
  export const dimLightsSchema = {
    name: 'dimLights',
    description: 'Dim the lights to create the perfect ambiance.',
    parameters: {
      type: 'OBJECT',
      properties: {
        brightness: { 
          type: 'NUMBER', 
          description: 'The brightness of the lights, 0.0 is off, 1.0 is full brightness.' 
        }
      },
      required: ['brightness']
    }
  };
  
  // Compositional Function Calling Demo Tools
  export const setRoomTemperatureSchema = {
    name: 'setRoomTemperature',
    description: 'Sets the room thermostat to a desired temperature.',
    parameters: {
      type: 'OBJECT',
      properties: {
        temperature: { 
          type: 'NUMBER', 
          description: 'Target temperature in Celsius.' 
        }
      },
      required: ['temperature']
    }
  };
  
  export const getRoomSensorsSchema = {
    name: 'getRoomSensors',
    description: 'Gets current room sensor readings including temperature, humidity, and light levels.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  };
  
  export const uiToolSchemas = [
    captureScreenshotSchema,
    switchTabSchema,
    generateImageSchema,
    editImageSchema,
    powerDiscoBallSchema,
    startMusicSchema,
    dimLightsSchema,
    setRoomTemperatureSchema,
    getRoomSensorsSchema
  ];