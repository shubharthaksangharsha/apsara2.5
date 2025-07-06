import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BellRing, FileUp, Menu, Mic, Moon, Send, Settings, Sun, User, X, MessageSquare, UploadCloud, AudioLines, Cog, Trash2, MicOff, BrainCircuit, Image as ImageIcon, BookOpen, Link as LinkIcon, UserIcon, Code, Sparkles, Plane, UtensilsCrossed, History, Film, PenTool, Globe, FileText, Lightbulb, Target, Search, LogOut } from 'lucide-react';

// Import the new components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import SettingsPanel from './components/SettingsPanel';
import LivePopup from './components/LivePopup';
import EmptyChatContent from './components/EmptyChatContent'; // Import the refactored component
import { FileUploadPopup, FilePreviewBar } from './components/Files';
import MapDisplay from './components/MapDisplay'; // <-- Import MapDisplay
import VideoStreamDisplay from './components/VideoStreamDisplay';
import ScreenShareDisplay from './components/ScreenShareDisplay';

// Import common constants
import { BACKEND_URL, MAX_LOCALSTORAGE_SIZE_MB, BYTES_PER_MB, MAX_STORAGE_BYTES } from './hooks/common-constants';

// Import the custom hook
import { useTheme } from './hooks/useTheme/index';
import { useAppSettings } from './hooks/useAppSettings/index';
import { useConversations } from './hooks/useConversations/index';
import { useChatApi } from './hooks/useChatApi/index';
import { useFileUpload } from './hooks/useFileUpload/index';
import { useLiveSession } from './hooks/useLiveSession/index';
import { useGoogleAuth } from './hooks/useGoogleAuth/index';
import { getModelCapabilities } from './utils/modelCapabilities'; // Import capability checker

// Define suggested prompts with optional target models and tool usage
const suggestedPrompts = [
  // Technical & Coding (Using Pro for complexity/accuracy & Code Execution)
  { text: "Explain the concept of closures in JavaScript", icon: BrainCircuit, modelId: "gemini-2.5-flash-preview-04-17"},
  { text: "Generate and execute Python code to print a random number (1-10)", icon: Code, modelId: "gemini-2.0-flash", toolUsage: 'codeExecution' },
  { text: "Debug this SQL query:\nSELECT user, COUNT(*) FROM orders GROUP BY product;", icon: Code, modelId: "gemini-2.0-flash", toolUsage: 'codeExecution' },
  { text: "What are the main differences between React and Vue?", icon: BrainCircuit },

  // Creative & Writing (Using Flash for speed/versatility)
  { text: "Write a short poem about a rainy day", icon: PenTool, modelId: "gemini-1.5-flash" },
  { text: "Generate a marketing slogan for a new coffee shop", icon: Sparkles, modelId: "gemini-1.5-flash" },
  { text: "Write a short story about a space explorer finding a new planet", icon: BookOpen, modelId: "gemini-1.5-flash" },

  // Image Generation (Using 2.0 Flash Image variant)
  { text: "Generate an image of a futuristic cityscape at sunset", icon: ImageIcon, modelId: "gemini-2.0-flash-preview-image-generation" },
  { text: "Generate an image of a cat wearing sunglasses", icon: ImageIcon, modelId: "gemini-2.0-flash-preview-image-generation" },

  // Planning & Practical (Using Flash)
  { text: "Create a recipe for vegan lasagna", icon: UtensilsCrossed, modelId: "gemini-1.5-flash" },
  { text: "Plan a 3-day weekend trip to London", icon: Plane, modelId: "gemini-1.5-flash" },
  { text: "Suggest some fun team-building activities for a remote team", icon: Sparkles, modelId: "gemini-1.5-flash" },
  { text: "Draft an email asking for a project extension", icon: FileText, modelId: "gemini-1.5-flash" },

  // Knowledge & Explanation (Mix based on potential complexity)

  { text: "Provide tips for improving public speaking skills", icon: BookOpen, modelId: "gemini-1.5-flash" },
  { text: "Explain the concept of blockchain technology simply", icon: Globe, modelId: "gemini-1.5-flash" },
  { text: "Summarize the main events of World War II", icon: History, modelId: "gemini-2.5-flash-preview-04-17" },
  { text: "What is the plot of the movie 'Inception'?", icon: Film, modelId: "gemini-1.5-flash" },
  { text: "Give me ideas for a challenging programming project", icon: Lightbulb, modelId: "gemini-1.5-flash"},
  { text: "Search for recent news about AI developments", icon: Search, modelId: "gemini-2.0-flash", toolUsage: 'googleSearch' },
  { text: "What is the Current date and time", icon: Search, modelId: "gemini-2.0-flash", toolUsage: 'googleSearch' },
];
            
// Main App component                                                                                                            
export default function App() {
  // Theme - Use the custom hook
  const [darkMode, setDarkMode] = useTheme();

  // Google Auth state
  const { 
    isAuthenticated, 
    userProfile, 
    isAuthLoading, 
    signIn: googleSignIn, 
    signOut: googleSignOut, 
    skipAuth, 
    wasAuthSkipped 
  } = useGoogleAuth();
  
  // Track if auth was skipped to show appropriate UI
  const [authSkipped, setAuthSkipped] = useState(wasAuthSkipped());

  // State for initial data loading (consider moving fetch logic into a hook too)
  const [models, setModels] = useState([]);
  const [voices, setVoices] = useState([]);
  const [initialSystemInstruction, setInitialSystemInstruction] = useState(null); 
  const [initialFiles, setInitialFiles] = useState([]); 
  const [dataLoading, setDataLoading] = useState(true); 

  // New state for images selected for the prompt
  const [selectedImagesForPrompt, setSelectedImagesForPrompt] = useState([]);
  // New state to track uploading status of individual prompt images
  const [promptImageUploadStatus, setPromptImageUploadStatus] = useState({}); // { [fileName]: 'uploading' | 'success' | 'error' }

  const {
    convos,
    setConvos, // Still needed by useChatApi
    activeConvoId,
    setActiveConvoId,
    handleNewChat: createNewChat, // Rename for clarity
    handleDeleteChat,
    handleDeleteAllChats,
    handleEditChatTitle,
    handlePinChat,
  } = useConversations();

  const {
    currentModel, setCurrentModel,
    currentVoice, setCurrentVoice,
    systemInstruction, setSystemInstruction, // Allow direct set for initial load
    handleSystemInstructionSave,
    temperature, setTemperature,
    maxOutputTokens, setMaxOutputTokens,
    enableGoogleSearch, setEnableGoogleSearch,
    enableCodeExecution, setEnableCodeExecution,
    enableThinking, setEnableThinking, // <-- New
    thinkingBudget, setThinkingBudget, // <-- New
    enableFunctionCalling, setEnableFunctionCalling, // <-- New
    selectedTools, setSelectedTools, // <-- New
    functionCallingMode, setFunctionCallingMode, // <-- New
    isSystemInstructionApplicable,
    isSearchSupportedByModel,
    isCodeExecutionSupportedByModel,
    isThinkingSupportedByModel, // <-- New
    isThinkingBudgetSupportedByModel, // <-- New
  } = useAppSettings(initialSystemInstruction ?? 'You are a helpful assistant.'); // Pass fetched instruction

  const {
    files, // This state from useFileUpload is for files *being sent* with a message
    setFiles, // This will be used by useChatApi's clearUploadedFiles
    uploadFile, // We'll use this to upload selected prompt images
    removeFile,
  } = useFileUpload(initialFiles); 



  const {
    isLoading: isChatLoading, 
    streamingModelMessageId, 
    sendToBackend: originalSendToBackend, // Rename original
    startStreamChat: originalStartStreamChat, // Rename original
  } = useChatApi({ 
    convos, setConvos, activeConvoId, setActiveConvoId, 
    currentModel, temperature, maxOutputTokens, enableGoogleSearch, enableCodeExecution, systemInstruction, isSystemInstructionApplicable, 
    enableThinking, thinkingBudget, 
    enableFunctionCalling, selectedTools, functionCallingMode, // <-- New
    uploadedFiles: files, // This will be populated with uploaded prompt image metadata
    clearUploadedFiles: () => {
      setFiles([]);
      setPromptImageUploadStatus({}); // Clear status when chat API clears files
    },
  });
  
  // Handle Google sign in
  const handleGoogleSignIn = () => {
    googleSignIn();
  };

  // Handle skip authentication
  const handleSkipAuth = () => {
    skipAuth();
    setAuthSkipped(true);
  };

  // Handle sign out
  const handleSignOut = () => {
    googleSignOut();
    // Don't automatically set authSkipped back to false
    // The user might want to continue using the app without auth
  };

  // Check for auth callback from OAuth flow
  useEffect(() => {
    // Check if the URL contains the auth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (authCode && state) {
      // Clear the URL parameters without a page refresh
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Send the auth code to backend for processing
      const processAuthCode = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/auth/google/callback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: authCode, state }),
            credentials: 'include'
          });
          
          if (response.ok) {
            // Reload the page to get fresh auth state
            window.location.reload();
          }
        } catch (error) {
          console.error('Error processing auth code:', error);
        }
      };
      
      processAuthCode();
    }
  }, []);

  // Clear file attachments on page load/reload
  useEffect(() => {
    // Clear any existing file attachments when the component mounts (page loads/reloads)
    setFiles([]);
    setInitialFiles([]); // Also clear initialFiles to prevent persistence
    setSelectedImagesForPrompt([]);
    setPromptImageUploadStatus({});
    console.log('[App.jsx] Cleared file attachments on page load/reload');
  }, []); // Empty dependency array means this runs once on mount

  // Add a general loading state for App component operations like image uploading
  const [isAppLoading, setIsAppLoading] = useState(false);

  const handleSelectImagesForPrompt = async (newImageFiles) => {
    const imageFiles = Array.from(newImageFiles).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const newSelectedImagesWithPreview = [];
    const newStatuses = {};

    for (const file of imageFiles) {
      if (!selectedImagesForPrompt.some(existingFile => existingFile.name === file.name && existingFile.size === file.size) &&
          !files.some(existingFile => existingFile.originalname === file.name && existingFile.size === file.size)) {
        
        const previewUrl = URL.createObjectURL(file); // Create blob URL for preview
        newSelectedImagesWithPreview.push({ ...file, previewUrl, originalFile: file }); // Store original file and previewUrl
        newStatuses[file.name] = 'uploading';
      }
    }

    if (newSelectedImagesWithPreview.length === 0) return;

    setSelectedImagesForPrompt(prevImages => [...prevImages, ...newSelectedImagesWithPreview]);
    setPromptImageUploadStatus(prevStatus => ({ ...prevStatus, ...newStatuses }));

    setIsAppLoading(true);
    const currentUploadStatuses = { ...promptImageUploadStatus, ...newStatuses };

    for (const imageFileObj of newSelectedImagesWithPreview) {
      try {
        // uploadFile expects the actual File object, not our wrapper with previewUrl
        const metadata = await uploadFile(imageFileObj.originalFile);
        if (metadata) {
          setSelectedImagesForPrompt(prevSelected => prevSelected.map(img => 
            img.name === imageFileObj.name && img.size === imageFileObj.size 
            ? { ...img, id: metadata.id, uri: metadata.uri, originalname: imageFileObj.originalFile.name, mimetype: imageFileObj.originalFile.type } // Add originalname and mimetype for consistency
            : img
          ));
          setFiles(prevFiles => {
            if (!prevFiles.some(f => f.id === metadata.id)) {
              // Ensure the metadata stored in `files` also has originalname and mimetype
              return [...prevFiles, { ...metadata, originalname: imageFileObj.originalFile.name, mimetype: imageFileObj.originalFile.type }];
            }
            return prevFiles;
          });
          currentUploadStatuses[imageFileObj.name] = 'success';
        } else {
          currentUploadStatuses[imageFileObj.name] = 'error';
        }
      } catch (error) {
        console.error(`Error uploading ${imageFileObj.name}:`, error);
        currentUploadStatuses[imageFileObj.name] = 'error';
      }
      setPromptImageUploadStatus(prevStatus => ({ ...prevStatus, [imageFileObj.name]: currentUploadStatuses[imageFileObj.name] }));
    }
    setIsAppLoading(false);
  };

  // In sendToBackend and startStreamChat, when clearing images:
  // Make sure to revoke object URLs for the images that are being cleared to prevent memory leaks.

  const clearAndRevokeImages = (imagesToClear) => {
    imagesToClear.forEach(img => {
      if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    // Clear from selectedImagesForPrompt and promptImageUploadStatus as before
  };

  const sendToBackend = async (text, targetConvoId = null, initialConvoData = null, targetModelId = null) => {
    setIsAppLoading(true);

    const successfullyUploadedImages = selectedImagesForPrompt.filter(
      img => img.id && promptImageUploadStatus[img.name] === 'success'
    );

    // Filter filesForMessage to include only successfully uploaded prompt images
    // AND ensure these are also present in the general 'files' state if they were added there.
    const filesForMessage = files.filter(f => 
        successfullyUploadedImages.some(sImg => sImg.id === f.id)
    );
    
    console.log('[App.jsx] Sending with files:', filesForMessage);

    // Pass filesForMessage to the backend
    await originalSendToBackend(text, targetConvoId, initialConvoData, targetModelId, filesForMessage, activeConvoId);
    
    // Clear and revoke URLs for the images that were successfully sent
    clearAndRevokeImages(successfullyUploadedImages); 

    // Remove sent images from selectedImagesForPrompt
    setSelectedImagesForPrompt(prevImages => prevImages.filter(img => 
        !successfullyUploadedImages.some(sImg => sImg.name === img.name) // Match by name, as ID might be transient before backend confirmation
    ));

    // Update promptImageUploadStatus: remove entries for successfully sent images
    setPromptImageUploadStatus(prevStatus => {
        const newStatus = { ...prevStatus };
        successfullyUploadedImages.forEach(img => {
            if (newStatus[img.name] === 'success' || newStatus[img.name] === 'uploading') {
                delete newStatus[img.name];
            }
        });
        return newStatus;
    });

    // Remove these images from the main `files` state managed by useFileUpload
    setFiles(prevFiles => prevFiles.filter(f => 
        !successfullyUploadedImages.some(sImg => sImg.id === f.id) // Assuming sImg.id matches f.id for prompt images
    ));

    setIsAppLoading(false); 
  };

  const startStreamChat = async (text, targetConvoId = null, initialConvoData = null, targetModelId = null) => {
    setIsAppLoading(true);

    const successfullyUploadedImages = selectedImagesForPrompt.filter(
      img => img.id && promptImageUploadStatus[img.name] === 'success'
    );

    const filesForMessage = files.filter(f => 
        successfullyUploadedImages.some(sImg => sImg.id === f.id)
    );

    console.log('[App.jsx] Streaming with files:', filesForMessage);

    // Pass null for tool override parameters, then the files
    await originalStartStreamChat(text, targetConvoId, initialConvoData, targetModelId, null, null, filesForMessage);

    clearAndRevokeImages(successfullyUploadedImages); 
    setSelectedImagesForPrompt(prevImages => prevImages.filter(img => 
        !successfullyUploadedImages.some(sImg => sImg.name === img.name)
    ));
    setPromptImageUploadStatus(prevStatus => {
        const newStatus = { ...prevStatus };
        successfullyUploadedImages.forEach(img => {
            if (newStatus[img.name] === 'success' || newStatus[img.name] === 'uploading') {
                delete newStatus[img.name];
            }
        });
        return newStatus;
    });
    setFiles(prevFiles => prevFiles.filter(f => 
        !successfullyUploadedImages.some(sImg => sImg.id === f.id)
    ));

    setIsAppLoading(false);
  };

  // Also, when removing an image manually:
  const handleRemoveSelectedImage = (imageToRemove) => {
    if (imageToRemove.previewUrl && imageToRemove.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.previewUrl);
    }
    setSelectedImagesForPrompt(prevImages => prevImages.filter(image => image !== imageToRemove));
    setPromptImageUploadStatus(prevStatus => {
      const newStatus = { ...prevStatus };
      delete newStatus[imageToRemove.name];
      return newStatus;
    });
    if (imageToRemove.id) {
      removeFile(imageToRemove.id);
    }
  };

  const clearSelectedImagesForPrompt = () => {
    setSelectedImagesForPrompt([]);
    setPromptImageUploadStatus({});
  };

  
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true); // default ON
  const [slidingWindowEnabled, setSlidingWindowEnabled] = useState(true); // default ON
  const [slidingWindowTokens, setSlidingWindowTokens] = useState(4000); // default 4000
  // Native audio feature state (source of truth)
  const [nativeAudioFeature, setNativeAudioFeature] = useState('none');
  // Media resolution state (source of truth)
  const [mediaResolution, setMediaResolution] = useState('MEDIA_RESOLUTION_MEDIUM'); // default medium
  
  // Handler for updating native audio feature with validation and logging
  const handleNativeAudioFeatureChange = useCallback((newValue) => {
    // Validate the value
    if (!['none', 'affectiveDialog', 'proactiveAudio'].includes(newValue)) {
      console.error('❌ [App] Invalid native audio feature value:', newValue);
      return;
    }
    
    console.log('✅ [App] Setting nativeAudioFeature to:', newValue);
    setNativeAudioFeature(newValue);
  }, []);
  
  // Handler for updating media resolution with validation and logging
  const handleMediaResolutionChange = useCallback((newValue) => {
    // Validate the value
    const validResolutions = ['MEDIA_RESOLUTION_LOW', 'MEDIA_RESOLUTION_MEDIUM', 'MEDIA_RESOLUTION_HIGH'];
    if (!validResolutions.includes(newValue)) {
      console.error('❌ [App] Invalid media resolution value:', newValue);
      return;
    }
    
    console.log('✅ [App] Setting mediaResolution to:', newValue);
    setMediaResolution(newValue);
  }, []);

  
  const {
    // Live State
    liveMessages,
    liveConnectionStatus,
    liveModality,
    liveSystemInstruction: currentLiveSystemInstruction, // Rename for clarity
    isModelSpeaking,
    sessionTimeLeft, // Get the timer state
    isRecording,
    audioError,
    isStreamingVideo,
    mediaStream,
    isStreamingScreen,
    selectedModel, // Add selected model
    screenStream,
    videoDevices, // <-- Add new state from hook
    selectedVideoDeviceId, // <-- Add new state from hook
    mapDisplayData,
    weatherUIData,
    calendarEvents,
    calendarEventsLastUpdated,
    currentSessionHandle, // Get the session handle from the hook
    // Live Handlers/Setters
    setLiveModality,
    setLiveSystemInstruction: setLivePrompt, // Rename for clarity
    setSelectedVideoDeviceId, // <-- Add new setter from hook
    setSelectedModel, // Add model selector setter
    getVideoInputDevices, // <-- Add new handler from hook
    startLiveSession,
    endLiveSession,
    sendLiveMessage,
    startRecording,
    stopRecording,
    startVideoStream,
    stopVideoStream,
    startScreenShare,
    stopScreenShare,
    flipCamera,
    handleAutoSessionResume,
    setSessionResumeHandle, // NEW: Expose function to set the session resume handle directly
    activeTab,
    setActiveTab,
  } = useLiveSession({
    currentVoice,
    transcriptionEnabled,
    slidingWindowEnabled,
    slidingWindowTokens,
    nativeAudioFeature, // Use the state variable
    mediaResolution, // Pass media resolution to useLiveSession
  });

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Live chat popup
  const [liveOpen, setLiveOpen] = useState(false);
  // File upload popup
  const [fileUploadOpen, setFileUploadOpen] = useState(false);
  // Live Settings Panel state
  const [liveSettingsOpen, setLiveSettingsOpen] = useState(false); // REMOVED - No longer needed as separate panel
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarLocked, setSidebarLocked] = useState(false); // <-- Add this state
  const [streamToggleState, setStreamToggleState] = useState(true); // <-- Add state for stream toggle (default true)

  // Add effect to default sidebar open state based on screen size initially
  useEffect(() => {
    const checkSize = () => {
      const isLargeScreen = window.innerWidth >= 1024;
      if (isLargeScreen) {
        // Large screens: Start unlocked, visually collapsed state handled by width/classes
        setIsSidebarOpen(true); // Keep it technically "open" for layout flow
        setSidebarLocked(false); 
      } else {
        // Small screens: Start closed and unlocked
        setIsSidebarOpen(false);
        setSidebarLocked(false); 
      }
    };
    checkSize(); 
    window.addEventListener('resize', checkSize); 
    return () => window.removeEventListener('resize', checkSize); 
  }, []);

  // --- Initial Data Fetching ---
  useEffect(() => {
    const fetchInitialData = async () => {
      setDataLoading(true);
      try {
        const [modelsRes, voicesRes, systemRes, filesRes] = await Promise.all([
          fetch(`${BACKEND_URL}/models`),
          fetch(`${BACKEND_URL}/voices`),
          fetch(`${BACKEND_URL}/system`),
          fetch(`${BACKEND_URL}/files`)
        ]);

        const modelsData = await modelsRes.json();
        setModels(modelsData);

        const voicesData = await voicesRes.json();
        setVoices(voicesData.voices || []);

        const systemData = await systemRes.json();
        // Set initialSystemInstruction which feeds useAppSettings
        setInitialSystemInstruction(systemData.systemInstruction);
        // Also update the live prompt default
        setLivePrompt(systemData.systemInstruction || 'You are a helpful assistant.');

        const filesData = await filesRes.json();
        setInitialFiles(filesData.files || []); // Feeds useFileUpload

      } catch (error) {
        console.error('Error fetching initial data:', error);
        // Handle error appropriately (e.g., show error message)
    } finally {
        setDataLoading(false);
      }
    };
    fetchInitialData();
  }, [setLivePrompt]); // Added setLivePrompt dependency

  // Function to close sidebar, only if not locked
  const closeSidebar = useCallback(() => {
    // Only applicable for small screens via overlay click
    if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
    }
  }, []);

  // --- Modified onClick for the *sidebar's* hamburger ---
  const handleSidebarHamburgerClick = useCallback(() => {
    if (window.innerWidth < 1024) {
        setIsSidebarOpen(prev => !prev); 
        } else {
        // On large screens, this button only toggles lock
        setSidebarLocked(prev => !prev);
        setIsSidebarOpen(true); // Ensure it's visually open when locking
    }
  }, [setIsSidebarOpen, setSidebarLocked]);
  // --- End Modified onClick ---

  // --- NEW: Handlers for Sidebar Actions ---
  const handleStartNewChat = useCallback(() => {
    createNewChat(); // Call handler from useConversations
    if (window.innerWidth < 1024) closeSidebar();
  }, [createNewChat, closeSidebar]);

  // Handler for suggested prompts
  const startChatWithPrompt = useCallback(async (promptText, targetModelId = null, toolUsage = null) => {
    const id = Date.now().toString();
    const title = promptText.length > 30 ? promptText.substring(0, 30) + '...' : promptText;
    const initialConvoData = { id, title, messages: [] };

    let modelToUse = currentModel; // Start with current model

    // Determine the target model and set it if valid
    if (targetModelId && models.some(m => m.id === targetModelId)) {
      modelToUse = targetModelId;
      setCurrentModel(targetModelId); // Update the app state model
    } else if (targetModelId) { // If target ID provided but invalid
      console.warn(`Invalid target model ID "${targetModelId}" in suggested prompt. Using current model "${currentModel}".`);
    }

    // Handle Tool Activation based on prompt config and model capabilities
    const capabilities = getModelCapabilities(modelToUse);
    let shouldEnableSearch = false; // Determine overrides locally
    let shouldEnableCodeExec = false;
    // console.log(`Prompt clicked. Tool usage: ${toolUsage}, Model: ${modelToUse}, Capabilities:`, capabilities); // Debug log

    if (toolUsage === 'googleSearch') {
      if (capabilities.supportsSearch) {
        console.log("Activating Google Search for this prompt.");
        shouldEnableSearch = true;
        shouldEnableCodeExec = false; // Ensure mutual exclusivity
                    } else {
        console.warn(`Prompt requested Google Search, but model ${modelToUse} does not support it. Tool not enabled.`);
      }
    } else if (toolUsage === 'codeExecution') {
      if (capabilities.supportsCodeExecution) {
        console.log("Activating Code Execution for this prompt.");
        shouldEnableCodeExec = true;
        shouldEnableSearch = false; // Ensure mutual exclusivity
     } else {
        console.warn(`Prompt requested Code Execution, but model ${modelToUse} does not support it. Tool not enabled.`);
      }
    } // If toolUsage is null, we don't change the existing toggle states.

    // Update the global state for Settings Panel UI consistency
    setEnableGoogleSearch(shouldEnableSearch);
    setEnableCodeExecution(shouldEnableCodeExec);
    setStreamToggleState(true); // Force stream toggle ON for suggested prompts

    if (window.innerWidth < 1024) closeSidebar();

    console.log(`Starting STREAM chat with prompt: "${promptText}" (Model: ${modelToUse})`);
    // ALWAYS use streaming for suggested prompts, regardless of manual toggle
    await startStreamChat(promptText, id, initialConvoData, modelToUse, shouldEnableSearch, shouldEnableCodeExec); // Pass overrides
  }, [models, currentModel, setCurrentModel, setEnableGoogleSearch, setEnableCodeExecution, setStreamToggleState, closeSidebar, startStreamChat]); // Added setters to dependencies, removed sendToBackend as it's not used here

  // Function to load a saved live session
  const loadLiveSession = useCallback((resumeHandle, modality, voice, systemInstruction) => {
    if (!resumeHandle) {
      console.error("Cannot load session: No resume handle provided");
      return;
    }

    // Update settings based on saved session
    if (modality) setLiveModality(modality);
    if (voice) setCurrentVoice(voice);
    if (systemInstruction) setLivePrompt(systemInstruction);

    // Open live popup if not already open
    if (!liveOpen) setLiveOpen(true);
    
    // Explicitly set the session resume handle to restore the previous session
    setSessionResumeHandle(resumeHandle);
    
    // Wait a short time for UI to update before starting the session
    setTimeout(() => {
      console.log("Loading saved session with handle:", resumeHandle);
      // Now startLiveSession will use the handle we just set
      startLiveSession();
    }, 300);
  }, [liveOpen, setLiveOpen, setLiveModality, setCurrentVoice, setLivePrompt, startLiveSession, setSessionResumeHandle]);

  // NEW: Function to start a live chat with the current main chat context
  const startLiveWithMainContext = useCallback(() => {
    // Check if there's an active conversation with messages
    if (!activeConvoId) {
      // No active conversation, just start a regular live chat
      setLiveOpen(true);
      return;
    }

    const activeConvo = convos.find(c => c.id === activeConvoId);
    if (!activeConvo || !activeConvo.messages || activeConvo.messages.length === 0) {
      // No messages in the active conversation, just start a regular live chat
      setLiveOpen(true);
      return;
    }

    // Prepare a chat summary to send to the live session
    const userMessages = activeConvo.messages
      .filter(m => m.role === 'user' || m.role === 'model')
      .slice(-10) // Limit to the last 10 messages to avoid overwhelming the context
      .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text || (m.parts?.map(p => p.text || '').join(' ') || '')}`)
      .join('\n');

    // Construct a context message
    const contextMessage = 
      `This is a continuation of a previous text chat. Here's the relevant conversation history:\n\n${userMessages}\n\nPlease remember any information shared in this conversation context and continue appropriately.`;

    // Open the live popup
    setLiveOpen(true);

    // Set appropriate modality for continuation (default to AUDIO)
    setLiveModality('AUDIO');

    // Make sure we're not using any resume handle - always start a fresh session
    setSessionResumeHandle(null);

    // Start a new live session with the main chat context directly
    setTimeout(() => {
      startLiveSession(contextMessage);
    }, 300);
  }, [activeConvoId, convos, setLiveOpen, setLiveModality, startLiveSession, setSessionResumeHandle]);

  // Show loading indicator while initial data is fetched?
  if (dataLoading) {
      return (
          <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">Loading Apsara...</p>
              {/* Add a spinner here if desired */}
          </div>
      );
  }

  return (
    <div className="relative flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans overflow-hidden">
      {/* Sidebar Overlay - Only for small screens */}
      {isSidebarOpen && window.innerWidth < 1024 && ( 
        <div
           onClick={closeSidebar}
           className="fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden"
           aria-hidden="true"
        ></div>
      )}

      {/* Sidebar - Use Imported Component */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        sidebarLocked={sidebarLocked}
        convos={convos}
        activeConvoId={activeConvoId}
        onSetActiveConvoId={setActiveConvoId}
        onSetIsSidebarOpen={setIsSidebarOpen}
        onHandleSidebarHamburgerClick={handleSidebarHamburgerClick}
        closeSidebar={closeSidebar}
        onNewChat={createNewChat}
        onDeleteAllChats={handleDeleteAllChats}
        onDeleteChat={handleDeleteChat}
        onEditChatTitle={handleEditChatTitle}
        onPinChat={handlePinChat}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden transition-all duration-500 ease-in-out bg-gray-100 dark:bg-gray-900">
        {/* Header - Use Imported Component */}
          <Header
            models={models}
            currentModel={currentModel}
            setCurrentModel={setCurrentModel}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            setLiveOpen={setLiveOpen}
            setSettingsOpen={setSettingsOpen}
            isAuthenticated={isAuthenticated}
            userProfile={userProfile}
            onSignOut={handleSignOut}
            onToggleSidebar={handleSidebarHamburgerClick}
          />
        
        {/* Chat Messages Area - Now in scrollable container with FIXED height */}
        <div className="flex-1 flex flex-col overflow-y-auto p-2 sm:p-4 pb-0 bg-gray-100 dark:bg-gray-900 custom-scrollbar">
          {!activeConvoId ? (
            // No active chat: Show full Welcome Screen
            <WelcomeScreen
              allPrompts={suggestedPrompts} // Pass the full list
              onStartChatWithPrompt={startChatWithPrompt}
              onStartNewChat={handleStartNewChat}
              isAuthenticated={isAuthenticated}
              userProfile={userProfile}
              onGoogleSignIn={handleGoogleSignIn}
              onSkipAuth={handleSkipAuth}
              authSkipped={authSkipped}
            />
          ) : (
            // Active chat exists: Check for messages
            (() => {
              const activeConvo = convos.find(c => c.id === activeConvoId);
              if (activeConvo && activeConvo.messages && activeConvo.messages.length > 0) {
                // Ensure ChatWindow doesn't cause remounts if its key changes unnecessarily
                return <ChatWindow 
                  key={activeConvoId}
                  convo={activeConvo}
                  streamingModelMessageId={streamingModelMessageId}
                  isLoading={isChatLoading} 
                />; 
              } else {
                // Active chat but NO messages yet: Show EmptyChatContent
                // Pass the *same* props as WelcomeScreen gets for prompts
                return <EmptyChatContent 
                           key={`empty-${activeConvoId}`} // Add a key here too
                           allPrompts={suggestedPrompts} 
                           onStartChatWithPrompt={startChatWithPrompt} 
                       />;
              }
            })()
          )}
        </div>
        
        {/* Bottom Flex Container for File & Input */}
        <div className="w-full p-2 sm:p-3 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2 relative flex-shrink-0 bg-white dark:bg-gray-800">
          {/* File Preview Bar - Conditionally render */}
          {files && files.length > 0 && 
           (files.some(f => !selectedImagesForPrompt.find(sImg => sImg.id === f.id && promptImageUploadStatus[sImg.name] === 'success')) || selectedImagesForPrompt.length === 0) && (
            <FilePreviewBar files={files} onRemoveFile={removeFile} />
          )}
          
          {/* Action Buttons Row - NEW */}
          <div className="flex justify-between items-center mb-1">
            {/* Live Chat Button - Left side - Only show when there's an active conversation */}
            {activeConvoId && (
              <button 
                onClick={startLiveWithMainContext} 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium rounded-lg shadow-sm hover:from-indigo-600 hover:to-purple-600 transition-colors"
              >
                <AudioLines className="w-3.5 h-3.5" /> Start Live Chat
              </button>
            )}
            
            {/* Right side - future actions could go here */}
            <div></div>
          </div>

          {/* Chat Input Area */}
          <MessageInput
          onSend={sendToBackend}
          onStreamSend={startStreamChat}
          isLoading={isChatLoading}
          disabled={!activeConvoId}
          onFileUploadClick={() => setFileUploadOpen(true)} // For general files
          streamEnabled={streamToggleState}
          onStreamToggleChange={setStreamToggleState}
          // --> ADD THESE PROPS FOR IMAGE SELECTION <--
          selectedImagesForPrompt={selectedImagesForPrompt}
          onSelectImagesForPrompt={handleSelectImagesForPrompt}
          onRemoveSelectedImage={handleRemoveSelectedImage}
          promptImageUploadStatus={promptImageUploadStatus} // Pass the status object
        />
        </div>
      </main>

      {/* Settings Panel - Use Imported Component */}
      {settingsOpen && (
        <SettingsPanel
          currentModel={currentModel}
          models={models} // Pass the models list for the dropdown
          onModelChange={setCurrentModel} // Pass the setter for model change
          isSystemInstructionApplicable={isSystemInstructionApplicable}
          systemInstruction={systemInstruction}
          onSystemInstructionChange={handleSystemInstructionSave}
          onClose={() => setSettingsOpen(false)}
          isOpen={settingsOpen}
          temperature={temperature}
          maxOutputTokens={maxOutputTokens}
          enableGoogleSearch={enableGoogleSearch}
          enableCodeExecution={enableCodeExecution}
          isSearchSupported={isSearchSupportedByModel}
          isCodeExecutionSupported={isCodeExecutionSupportedByModel}
          onTemperatureChange={setTemperature}
          onMaxOutputTokensChange={setMaxOutputTokens}
          onEnableGoogleSearchChange={setEnableGoogleSearch}
          onEnableCodeExecutionChange={setEnableCodeExecution}
          // Props for Thinking Mode
          enableThinking={enableThinking}
          onEnableThinkingChange={setEnableThinking}
          isThinkingSupported={isThinkingSupportedByModel}
          // Props for Thinking Budget
          thinkingBudget={thinkingBudget}
          onThinkingBudgetChange={setThinkingBudget}
          isThinkingBudgetSupported={isThinkingBudgetSupportedByModel}
          // Props for Function Calling / Tool Selection
          enableFunctionCalling={enableFunctionCalling}
          onEnableFunctionCallingChange={setEnableFunctionCalling}
          selectedTools={selectedTools}
          onSelectedToolsChange={setSelectedTools}
          functionCallingMode={functionCallingMode}
          onFunctionCallingModeChange={setFunctionCallingMode}
          isAuthenticated={isAuthenticated}
        />
      )}

      {/* Live Chat Popup - Conditionally render the popup */}
      {liveOpen && (
        <LivePopup 
          connectionStatus={liveConnectionStatus}
          messages={liveMessages}
          currentVoice={currentVoice}
          voices={voices}
          onVoiceChange={setCurrentVoice}
          audioError={audioError}
          liveModality={liveModality}
          onModalityChange={setLiveModality}
          liveSystemInstruction={currentLiveSystemInstruction}
          onSystemInstructionChange={setLivePrompt}
          onClose={() => {
              endLiveSession();
              setLiveOpen(false);
          }}
          onStartSession={startLiveSession}
          onEndSession={endLiveSession}
          onSendMessage={sendLiveMessage}
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          isModelSpeaking={isModelSpeaking}
          sessionTimeLeft={sessionTimeLeft}
          isStreamingVideo={isStreamingVideo}
          mediaStream={mediaStream}
          isStreamingScreen={isStreamingScreen}
          screenStream={screenStream}
          onStartVideo={startVideoStream}
          onStopVideo={stopVideoStream}
          onStartScreenShare={startScreenShare}
          onStopScreenShare={stopScreenShare}
          // Video device props
          videoDevices={videoDevices}
          selectedVideoDeviceId={selectedVideoDeviceId}
          userProfile={userProfile}
          onSetSelectedVideoDeviceId={setSelectedVideoDeviceId}
          onGetVideoInputDevices={getVideoInputDevices}
          flipCamera={flipCamera}
          weatherUIData={weatherUIData}
          calendarEvents={calendarEvents}
          calendarEventsLastUpdated={calendarEventsLastUpdated}
          transcriptionEnabled={transcriptionEnabled}
          setTranscriptionEnabled={setTranscriptionEnabled}
          slidingWindowEnabled={slidingWindowEnabled}
          setSlidingWindowEnabled={setSlidingWindowEnabled}
          slidingWindowTokens={slidingWindowTokens}
          setSlidingWindowTokens={setSlidingWindowTokens}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          onAutoResumeSession={handleAutoSessionResume}
          onLoadSession={loadLiveSession} // Add new prop for loading saved sessions
          onStartWithMainContext={startLiveWithMainContext} // NEW: Add prop for starting with main chat context
          currentSessionHandle={currentSessionHandle} // Pass the properly exposed value from useLiveSession hook
          startedWithMainContext={activeConvoId != null} // Set true if opened from main chat
          setSessionResumeHandle={setSessionResumeHandle} // Pass the session resume handle
          nativeAudioFeature={nativeAudioFeature}
          onNativeAudioFeatureChange={handleNativeAudioFeatureChange}
          mediaResolution={mediaResolution}
          onMediaResolutionChange={handleMediaResolutionChange}
        />
      )}

      {/* Map Display - Conditionally render *next to* or *near* the LivePopup */}
      {/* Render only if LivePopup is open AND we have map data */}
      {!liveOpen && mapDisplayData && (
         <div className="fixed top-[4vh] sm:top-[8vh] right-[2vw] w-[90vw] sm:w-[40vw] md:w-[30vw] max-w-full sm:max-w-[450px] h-[50vh] sm:h-[84vh] z-[55] ...">
            <MapDisplay mapData={mapDisplayData} />
         </div>
      )}

      {/* THESE ARE THE FLOATING, TOP-RIGHT VIEWS
      {liveOpen && isStreamingVideo && mediaStream && (
        <VideoStreamDisplay 
          videoStream={mediaStream} 
          isWebcamActive={isStreamingVideo} 
          onSwitchCamera={flipCamera}
          isFlipAvailable={true}
        />
      )}
      {liveOpen && isStreamingScreen && screenStream && (
        <ScreenShareDisplay screenStream={screenStream} isScreenSharingActive={isStreamingScreen} />
      )} */}

      {/* File Upload Popup - Use Imported Component */}
      {fileUploadOpen && (
        <FileUploadPopup
          onClose={() => setFileUploadOpen(false)}
          onUpload={uploadFile}
          files={files}
        />
      )}

    </div>
  );
}