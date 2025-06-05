// websocket/config/paramParser.js - Parse URL parameters
import { Modality } from '@google/genai';
import { availableVoices } from '../../config/ai.js';

// Parse URL parameters for WebSocket connection
export function parseConnectionParams(req) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  console.log(`[Live Backend] Handling connection for URL: ${req.url}`);

  // Initialize configuration object
  const config = {
    requestedModality: 'AUDIO',
    requestedVoice: null,
    requestedSystemInstruction: null,
    transcriptionEnabled: true,
    slidingWindowEnabled: true,
    slidingWindowTokens: 4000,
    requestedModel: 'gemini-2.0-flash-live-001', // Default model
    requestedResumeHandle: null,
    mediaResolution: "MEDIA_RESOLUTION_MEDIUM", // Default media resolution
    requestedRealtimeConfig: {}
  };

  // --- Modality Parsing ---
  const modalityParam = parsedUrl.searchParams.get('modalities')?.trim().toUpperCase();
  if (modalityParam === 'AUDIO') {
    config.requestedModality = Modality.AUDIO;
    console.log("[Live Backend] Requested Modality: AUDIO");
  } else if (modalityParam === 'VIDEO') {
    config.requestedModality = Modality.VIDEO;
    console.log("[Live Backend] Requested Modality: VIDEO");
  } else { // Default to TEXT if not AUDIO/VIDEO or missing
    config.requestedModality = Modality.TEXT;
    console.log("[Live Backend] Requested Modality: TEXT");
  }

  // --- Voice Parsing ---
  if (config.requestedModality === Modality.AUDIO && parsedUrl.searchParams.get('voice')) {
    const voiceParam = parsedUrl.searchParams.get('voice');
    if (availableVoices.includes(voiceParam)) {
      config.requestedVoice = voiceParam;
      console.log(`[Live Backend] Using requested voice: ${config.requestedVoice}`);
    } else {
      console.warn(`[Live Backend] Requested voice '${voiceParam}' not available, using default '${config.requestedVoice}'`);
    }
  } else {
    console.log("[Live Backend] Text modality selected or voice param missing, voice parameter ignored.");
    config.requestedVoice = null;
  }

  // --- System Instruction Parsing ---
  if (parsedUrl.searchParams.get('system')) {
    // Decode URI component in case it's encoded
    try {
      config.requestedSystemInstruction = decodeURIComponent(parsedUrl.searchParams.get('system').toString());
      console.log(`[Live Backend] Using requested system instruction: "${config.requestedSystemInstruction.substring(0, 50)}..."`);
    } catch (e) {
      console.error('[Live Backend] Error decoding system instruction parameter:', e);
    }
  } else {
    console.log("[Live Backend] No system instruction provided.");
  }

  // VAD Config
  if (parsedUrl.searchParams.get('disablevad') === 'true' && config.requestedModality === Modality.AUDIO) {
    config.requestedRealtimeConfig.disableAutomaticActivityDetection = true;
    console.log("[Live Backend] Automatic activity detection (VAD) DISABLED via query param.");
  }
    
  // --- Native Audio Features Detection ---
  console.log(`[Live Backend] URL query params: ${req.url}`);
    
  // Extract all query parameters for debugging
  const allParams = {};
  for (const [key, value] of parsedUrl.searchParams.entries()) {
    allParams[key] = value;
  }
  console.log('[Live Backend] All query parameters:', JSON.stringify(allParams));
    
  // Enhanced native audio feature detection with better logging
  const hasAffectiveDialog = parsedUrl.searchParams.has('enableAffectiveDialog') && 
                            parsedUrl.searchParams.get('enableAffectiveDialog') === 'true';
  const hasProactiveAudio = parsedUrl.searchParams.has('proactiveAudio') && 
                          parsedUrl.searchParams.get('proactiveAudio') === 'true';
  const hasGenericNativeAudio = parsedUrl.searchParams.has('nativeAudio') &&
                              parsedUrl.searchParams.get('nativeAudio') === 'true';
    
  // Print detailed parameter analysis
  console.log('💾 [Live Backend] Native Audio Feature Parameters:');
  console.log('  * enableAffectiveDialog =', parsedUrl.searchParams.get('enableAffectiveDialog'));
  console.log('  * proactiveAudio =', parsedUrl.searchParams.get('proactiveAudio'));
  console.log('  * nativeAudio =', parsedUrl.searchParams.get('nativeAudio'));
    
  // Check for media resolution parameter
  config.mediaResolution = parsedUrl.searchParams.get('mediaResolution') || "MEDIA_RESOLUTION_MEDIUM";
  console.log('  * mediaResolution =', config.mediaResolution);
    
  // Print feature status summary
  console.log('📝 [Live Backend] Native Audio Feature Status:');
  console.log('  * Affective Dialog:', hasAffectiveDialog ? 'ENABLED ✅' : 'DISABLED ❌');
  console.log('  * Proactive Audio:', hasProactiveAudio ? 'ENABLED ✅' : 'DISABLED ❌');
  console.log('  * Generic Native Audio:', hasGenericNativeAudio ? 'ENABLED ✅' : 'DISABLED ❌');
  console.log('  * Media Resolution:', config.mediaResolution);
    
  // Validate for potential conflicts
  if (hasAffectiveDialog && hasProactiveAudio) {
    console.warn('⚠️ [Live Backend] WARNING: Both Affective Dialog and Proactive Audio are enabled!');
    console.log('    This is a mutually exclusive configuration, behavior may be unpredictable');
  }
    
  if ((hasAffectiveDialog || hasProactiveAudio) && hasGenericNativeAudio) {
    console.warn('⚠️ [Live Backend] WARNING: Both specific feature and generic nativeAudio=true are set');
    console.log('    This may cause conflicts - the model might ignore the specific feature');
  }
    
  // --- Session Resumption Handle Parsing ---
  if (parsedUrl.searchParams.get('resumehandle')) {
    config.requestedResumeHandle = parsedUrl.searchParams.get('resumehandle').toString();
    console.log("[Live Backend] Attempting session resumption with handle.");
  }

  // --- Sliding Window and Transcription Parsing ---
  if (parsedUrl.searchParams.get('slidingwindow') !== undefined) {
    config.slidingWindowEnabled = parsedUrl.searchParams.get('slidingwindow') === 'true';
  }
  if (parsedUrl.searchParams.get('slidingwindowtokens') !== undefined) {
    config.slidingWindowTokens = parseInt(parsedUrl.searchParams.get('slidingwindowtokens'), 10) || 4000;
  }
  if (parsedUrl.searchParams.get('transcription') !== undefined) {
    config.transcriptionEnabled = parsedUrl.searchParams.get('transcription') !== 'false';
  }

  // --- Model Parsing ---
  const modelParam = parsedUrl.searchParams.get('model');
  if (modelParam) {
    config.requestedModel = modelParam;
    console.log(`[Live Backend] Using requested model: ${config.requestedModel}`);
  } else {
    console.log(`[Live Backend] No model specified, using default: ${config.requestedModel}`);
  }

  return config;
}
