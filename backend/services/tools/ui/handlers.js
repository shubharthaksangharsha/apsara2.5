// services/tools/ui/handlers.js
import { imageStore } from '../store.js';
import { generateImage, editImage } from '../../ai/image/index.js';

/**
 * Captures a screenshot
 */
export async function handleCaptureScreenshot({ description, selector }) {
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

/**
 * Switches the active tab in the UI
 */
export function handleSwitchTab({ tab }) {
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

/**
 * Generates an image using AI
 */
export async function handleGenerateImage({ prompt }) {
  console.log(`[Tool: generateImage] Generating image with prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);  
  
  try {
    // Call the image generation function from image-gen.js
    const result = await generateImage(prompt);
    
    if (!result.success) {
      return {
        status: 'error',
        message: result.error || 'Failed to generate image',
      };
    }
    
    // Store the generated image for later editing
    imageStore.lastGeneratedImage = result.imageData;
    imageStore.lastMimeType = result.mimeType || 'image/png';
    console.log(`[Tool: generateImage] Stored image in memory cache for future editing`);
    
    // Send both the image data and the description back to the model and client
    return {
      status: 'success',
      message: 'Image generated successfully',
      imageData: result.imageData,
      mimeType: result.mimeType,
      description: result.description,
      action: 'imageGenerated',
      timestamp: result.timestamp,
    };
  } catch (error) {
    console.error(`[Tool: generateImage] Error: ${error.message}`);
    return {
      status: 'error',
      message: `Failed to generate image: ${error.message}`
    };
  }
}

/**
 * Edits an image using AI
 */
export async function handleEditImage({ prompt, imageId }) {
  console.log(`[Tool: editImage] Editing image with prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);  
  
  try {
    // Check if we have a stored image to edit
    if (!imageStore.lastGeneratedImage) {
      console.log(`[Tool: editImage] No previous image found to edit. Generating a new image instead.`);
      return handleGenerateImage({ prompt });
    }
    
    console.log(`[Tool: editImage] Found previous image to edit. Using stored image with edit prompt.`);
    
    // Call the image editing function with the stored image
    const result = await editImage(
      prompt, 
      imageStore.lastGeneratedImage, 
      imageStore.lastMimeType || 'image/png'
    );
    
    if (!result.success) {
      return {
        status: 'error',
        message: result.error || 'Failed to edit image',
      };
    }
    
    // Update the stored image with the edited version
    imageStore.lastGeneratedImage = result.imageData;
    imageStore.lastMimeType = result.mimeType || 'image/png';
    
    // Send both the image data and the description back to the model and client
    return {
      status: 'success',
      message: 'Image edited successfully',
      imageData: result.imageData,
      mimeType: result.mimeType,
      description: result.description,
      action: 'imageEdited',
      timestamp: result.timestamp,
    };
  } catch (error) {
    console.error(`[Tool: editImage] Error: ${error.message}`);
    return {
      status: 'error',
      message: `Failed to edit image: ${error.message}`
    };
  }
}

/**
 * Powers a disco ball (simulation for parallel function calling demo)
 * @param {boolean} power - Whether to turn the disco ball on or off
 */
export async function powerDiscoBall(args) {
  console.log(`[powerDiscoBall] Setting disco ball power: ${args.power}`);
  
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    status: `Disco ball powered ${args.power ? 'on' : 'off'}`,
    power: args.power,
    timestamp: new Date().toISOString()
  };
}

/**
 * Starts music with specified parameters (simulation for parallel function calling demo)
 * @param {boolean} energetic - Whether the music is energetic
 * @param {boolean} loud - Whether the music is loud
 */
export async function startMusic(args) {
  console.log(`[startMusic] Starting music - energetic: ${args.energetic}, loud: ${args.loud}`);
  
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const musicType = args.energetic ? "energetic" : "chill";
  const volume = args.loud ? "loud" : "quiet";
  
  return {
    status: `Music started - ${musicType} and ${volume}`,
    musicType,
    volume,
    timestamp: new Date().toISOString()
  };
}

/**
 * Dims lights to specified brightness (simulation for parallel function calling demo)
 * @param {number} brightness - The brightness level (0.0 to 1.0)
 */
export async function dimLights(args) {
  console.log(`[dimLights] Setting lights brightness: ${args.brightness}`);
  
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const brightness = Math.max(0, Math.min(1, args.brightness)); // Clamp to 0-1
  
  return {
    status: `Lights dimmed to ${Math.round(brightness * 100)}%`,
    brightness,
    timestamp: new Date().toISOString()
  };
}

/**
 * Sets room temperature (simulation for compositional calling demo)
 * @param {number} temperature - Target temperature in Celsius
 */
export async function setRoomTemperature(args) {
  console.log(`[setRoomTemperature] Setting temperature: ${args.temperature}°C`);
  
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 400));
  
  return {
    status: `Room temperature set to ${args.temperature}°C`,
    temperature: args.temperature,
    unit: 'celsius',
    timestamp: new Date().toISOString()
  };
}

/**
 * Gets current room sensors data (simulation for compositional calling demo)
 */
export async function getRoomSensors() {
  console.log(`[getRoomSensors] Reading room sensors`);
  
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Simulate sensor readings
  const currentTemp = Math.round((Math.random() * 10 + 18) * 10) / 10; // 18-28°C
  const humidity = Math.round((Math.random() * 30 + 40) * 10) / 10; // 40-70%
  const lightLevel = Math.round(Math.random() * 100); // 0-100%
  
  return {
    temperature: currentTemp,
    humidity,
    lightLevel,
    unit: 'celsius',
    timestamp: new Date().toISOString()
  };
}

export const uiToolHandlers = {
  captureScreenshot: handleCaptureScreenshot,
  switchTab: handleSwitchTab,
  generateImage: handleGenerateImage,
  editImage: handleEditImage,
  powerDiscoBall,
  startMusic,
  dimLights,
  setRoomTemperature,
  getRoomSensors
};