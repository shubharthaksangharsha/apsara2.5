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

export const uiToolHandlers = {
  captureScreenshot: handleCaptureScreenshot,
  switchTab: handleSwitchTab,
  generateImage: handleGenerateImage,
  editImage: handleEditImage
};