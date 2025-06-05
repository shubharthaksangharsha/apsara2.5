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
  
  export const uiToolSchemas = [
    captureScreenshotSchema,
    switchTabSchema,
    generateImageSchema,
    editImageSchema
  ];