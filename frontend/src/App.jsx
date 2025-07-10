import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { BellRing, FileUp, Menu, Mic, Moon, Send, Settings, Sun, User, X, MessageSquare, UploadCloud, AudioLines, Cog, Trash2, MicOff, BrainCircuit, Image as ImageIcon, BookOpen, Link as LinkIcon, UserIcon, Code, Sparkles, Plane, UtensilsCrossed, History, Film, PenTool, Globe, FileText, Lightbulb, Target, Search, LogOut } from 'lucide-react';

// Import authentication components and context
import { AuthProvider } from './contexts/AuthContext';
import AuthScreen from './components/auth/AuthScreen';
import ResetPasswordScreen from './components/auth/ResetPasswordScreen';
import EmailVerificationScreen from './components/auth/EmailVerificationScreen';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Import the new components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import SettingsPanel from './components/SettingsPanel';
import LivePopup from './components/LivePopup';
import EmptyChatContent from './components/EmptyChatContent'; // Import the refactored component
import { FileManager } from './components/Files';
import CacheManager from './components/CacheManager';
import MapDisplay from './components/MapDisplay'; // <-- Import MapDisplay
import PluginManager from './components/PluginManager'; // <-- Import PluginManager


// Import common constants
import { BACKEND_URL, MAX_LOCALSTORAGE_SIZE_MB, BYTES_PER_MB, MAX_STORAGE_BYTES } from './hooks/common-constants';

// Import the token counting service
import { countTokensForFile } from './services/tokenCounter';
import { isGeminiSupported, getFileTypeName } from './utils/fileTypes';

// Import the custom hooks
import { useTheme } from './hooks/useTheme/index';
import { useAppSettings } from './hooks/useAppSettings/index';
import { useConversations } from './hooks/useConversations/index';
import { useChatApi } from './hooks/useChatApi/index';
import { useFileUpload } from './hooks/useFileUpload/index';
import { useLiveSession } from './hooks/useLiveSession/index';
import { useAuth } from './hooks/useAuth/index'; // Keep for compatibility
import { useAuthContext } from './contexts/AuthContext'; // New shared context
import { useGoogleAuth } from './hooks/useGoogleAuth/index';
import { getModelCapabilities } from './utils/modelCapabilities'; // Import capability checker

// Define suggested prompts with optional target models and tool usage
const suggestedPrompts = [
  // Technical & Coding (Using Gemini 2.5 Flash Preview for complexity & Code Execution)
  { text: "Explain the concept of closures in JavaScript", icon: BrainCircuit, modelId: "gemini-2.5-flash-preview-04-17"},
  { text: "Generate and execute Python code to print a random number (1-10)", icon: Code, modelId: "gemini-2.0-flash", toolUsage: 'codeExecution' },
  { text: "Debug this SQL query:\nSELECT user, COUNT(*) FROM orders GROUP BY product;", icon: Code, modelId: "gemini-2.0-flash", toolUsage: 'codeExecution' },
  { text: "What are the main differences between React and Vue?", icon: BrainCircuit, modelId: "gemini-2.5-flash-preview-04-17" },
  { text: "Create a Python script to calculate fibonacci numbers and execute it", icon: Code, modelId: "gemini-2.0-flash", toolUsage: 'codeExecution' },

  // Creative & Writing (Using Gemini 2.0 Flash for speed/versatility)
  { text: "Write a short poem about a rainy day", icon: PenTool, modelId: "gemini-2.0-flash" },
  { text: "Generate a marketing slogan for a new coffee shop", icon: Sparkles, modelId: "gemini-2.0-flash" },
  { text: "Write a short story about a space explorer finding a new planet", icon: BookOpen, modelId: "gemini-2.0-flash" },
  { text: "Create a creative product description for a smart watch", icon: PenTool, modelId: "gemini-2.0-flash" },

  // Image Generation & Editing (Using function calling tools)
  { text: "Generate an image of a futuristic cityscape at sunset", icon: ImageIcon, modelId: "gemini-2.0-flash", toolUsage: 'imageGeneration' },
  { text: "Generate an image of a cat wearing sunglasses", icon: ImageIcon, modelId: "gemini-2.0-flash", toolUsage: 'imageGeneration' },
  { text: "Create an image of a serene mountain lake at dawn", icon: ImageIcon, modelId: "gemini-2.0-flash", toolUsage: 'imageGeneration' },
  { text: "Generate an image of a modern minimalist kitchen design", icon: ImageIcon, modelId: "gemini-2.0-flash", toolUsage: 'imageGeneration' },

  // Planning & Practical (Using appropriate models)
  { text: "Create a recipe for vegan lasagna", icon: UtensilsCrossed, modelId: "gemini-2.0-flash" },
  { text: "Plan a 3-day weekend trip to London", icon: Plane, modelId: "gemini-2.0-flash" },
  { text: "Suggest some fun team-building activities for a remote team", icon: Sparkles, modelId: "gemini-2.0-flash" },
  { text: "Draft an email asking for a project extension", icon: FileText, modelId: "gemini-2.0-flash" },

  // Knowledge & Explanation with Google Search
  { text: "Search for recent news about AI developments", icon: Search, modelId: "gemini-2.0-flash", toolUsage: 'googleSearch' },
  { text: "What is the current date and time?", icon: Search, modelId: "gemini-2.0-flash", toolUsage: 'googleSearch' },
  { text: "Find the latest stock price of Tesla", icon: Search, modelId: "gemini-2.0-flash", toolUsage: 'googleSearch' },
  { text: "Search for today's weather forecast", icon: Search, modelId: "gemini-2.0-flash", toolUsage: 'googleSearch' },

  // Complex Knowledge & Explanation (Using Gemini 2.5 Flash Preview for complexity)
  { text: "Provide tips for improving public speaking skills", icon: BookOpen, modelId: "gemini-2.5-flash-preview-04-17" },
  { text: "Explain the concept of blockchain technology simply", icon: Globe, modelId: "gemini-2.5-flash-preview-04-17" },
  { text: "Summarize the main events of World War II", icon: History, modelId: "gemini-2.5-flash-preview-04-17" },
  { text: "What is the plot of the movie 'Inception'?", icon: Film, modelId: "gemini-2.0-flash" },
  { text: "Give me ideas for a challenging programming project", icon: Lightbulb, modelId: "gemini-2.5-flash-preview-04-17"},
];
            
// Main App component wrapper with routing
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth/reset-password" element={<ResetPasswordScreen />} />
          <Route path="/auth/verify-email" element={<EmailVerificationScreen />} />
          <Route path="/*" element={<MainApp />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Main App component with authentication
function MainApp() {
  // Theme - Use the custom hook
  const [darkMode, setDarkMode] = useTheme();

  // New comprehensive auth hook - use shared context
  const { 
    isAuthenticated, 
    user, 
    loading: authLoading, 
    error: authError,
    handleGoogleAuthSuccess,
    logout
  } = useAuthContext();

  // Debug logging for auth state
  console.log('🔍 App.jsx - Auth state:', { isAuthenticated, user: user?.name, authLoading });

  // Legacy Google Auth hook for compatibility
  const googleAuth = useGoogleAuth();

  // Handle authentication success from any method
  const handleAuthSuccess = useCallback((userData) => {
    // The useAuth hook will handle the state updates
    console.log('Authentication successful:', userData);
  }, []);

  // Render authentication screen if not authenticated
  if (!authLoading && !isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Render the main authenticated app
  return (
    <ProtectedRoute>
      <AuthenticatedApp 
        darkMode={darkMode} 
        setDarkMode={setDarkMode}
        user={user}
        onLogout={logout}
      />
    </ProtectedRoute>
  );
}

// Main authenticated app component
function AuthenticatedApp({ darkMode, setDarkMode, user, onLogout }) {

  // Authentication-related derived values
  const isAuthenticated = true; // Since this is inside AuthenticatedApp, user is always authenticated
  const userProfile = user; // Use the user prop passed from auth
  
  // Auth handlers (mostly for backward compatibility with existing components)
  const handleSignOut = onLogout;
  const handleGoogleSignIn = () => {
    // This would typically redirect to Google OAuth flow
    console.log('Google sign in clicked');
  };
  const handleSkipAuth = () => {
    // This is no longer relevant since we're in the authenticated app
    console.log('Skip auth clicked');
  };
  const authSkipped = false; // Always false in authenticated app

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

  // Backward compatibility variables
  const isConnected = liveConnectionStatus === 'connected';
  const isLiveSessionActive = liveConnectionStatus !== 'disconnected';
  const isLiveSessionLoading = liveConnectionStatus === 'connecting';
  const currentLiveModel = selectedModel;
  const setCurrentLiveModel = setSelectedModel;
  const audioEnabled = liveModality?.includes('audio') || false;
  const setAudioEnabled = (enabled) => {
    setLiveModality(prev => {
      if (enabled && !prev?.includes('audio')) {
        return prev ? [...prev, 'audio'] : ['audio'];
      } else if (!enabled && prev?.includes('audio')) {
        return prev?.filter(m => m !== 'audio') || [];
      }
      return prev;
    });
  };
  const videoEnabled = liveModality?.includes('video') || false;
  const setVideoEnabled = (enabled) => {
    setLiveModality(prev => {
      if (enabled && !prev?.includes('video')) {
        return prev ? [...prev, 'video'] : ['video'];
      } else if (!enabled && prev?.includes('video')) {
        return prev?.filter(m => m !== 'video') || [];
      }
      return prev;
    });
  };
  const handleLiveTextSend = sendLiveMessage;
  const liveSessionDuration = sessionTimeLeft;
  const reconnectAttempts = 0;
  const isReconnecting = liveConnectionStatus === 'connecting';

  // Component state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fileManagerOpen, setFileManagerOpen] = useState(false);
  const [cacheManagerOpen, setCacheManagerOpen] = useState(false);
  const [livePopupOpen, setLivePopupOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarLocked, setSidebarLocked] = useState(false);
  const [streamToggleState, setStreamToggleState] = useState(true);
  const [mapLocation, setMapLocation] = useState(null);
  const [videoStreamUrl, setVideoStreamUrl] = useState(null);
  const [screenShareUrl, setScreenShareUrl] = useState(null);
  const [currentView, setCurrentView] = useState('empty'); // 'empty' | 'chat' | 'files' | 'cache' | 'live' | 'settings'
  const [welcomeScreenOpen, setWelcomeScreenOpen] = useState(true);

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

  // Create an AbortController ref for managing API request cancellation
  const abortControllerRef = useRef(null);

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

  // Function to handle stopping ongoing API requests
  const handleStopRequest = () => {
    if (abortControllerRef.current) {
      console.log('[App.jsx] Aborting current API request');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsAppLoading(false);
    }
  };

  // Toggle thinking mode
  const handleToggleThinking = (enabled, budget = null) => {
    // If just toggling without specifying a budget, toggle the enabled state
    if (budget === null) {
      setEnableThinking(prev => !prev);
      return;
    }
    
    // Otherwise, set both the enabled state and budget
    setEnableThinking(enabled);
    setThinkingBudget(budget);
  };

  // State for plugin manager
  const [pluginManagerOpen, setPluginManagerOpen] = useState(false);

  // Toggle tools/function calling - now opens the plugin manager
  const handleToggleTools = () => {
    setPluginManagerOpen(true);
  };
  
  // We're now only using streaming for all requests
  const sendToBackend = async (text, targetConvoId = null, initialConvoData = null, targetModelId = null) => {
    // Simply redirect to streaming function
    return startStreamChat(text, targetConvoId, initialConvoData, targetModelId);
  };

  const startStreamChat = async (text, targetConvoId = null, initialConvoData = null, targetModelId = null, overrideEnableSearch = null, overrideEnableCodeExec = null, explicitFiles = null, overrideEnableFunctionCalling = null, overrideSelectedTools = null) => {
    setIsAppLoading(true);

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const successfullyUploadedImages = selectedImagesForPrompt.filter(
      img => img.id && promptImageUploadStatus[img.name] === 'success'
    );

    // Use explicit files if provided, otherwise use the default file handling
    let filesForMessage = explicitFiles || [];
    
    if (!explicitFiles) {
      // Include both successfully uploaded images AND all files from FileManager
      const imageFiles = files.filter(f => 
          successfullyUploadedImages.some(sImg => sImg.id === f.id)
      );
      
      // Add all other files from FileManager (PDFs, documents, etc.)
      const otherFiles = files.filter(f => 
          !successfullyUploadedImages.some(sImg => sImg.id === f.id)
      );
      
      // Combine all files to send to backend
      filesForMessage = [...imageFiles, ...otherFiles];
    }

    // Ensure all files have token counts before sending
    for (const file of filesForMessage) {
      if (!file.tokenCount || file.tokenCount === 0) {
        try {
          const tokenCount = await countTokensForFile(file);
          file.tokenCount = tokenCount;
          console.log(`[App.jsx] Counted tokens for ${file.originalname}: ${tokenCount}`);
        } catch (error) {
          console.warn(`[App.jsx] Failed to count tokens for ${file.originalname}:`, error);
        }
      }
    }

    console.log('[App.jsx] Streaming with files:', filesForMessage);

    // Clear selected prompt images after sending (success or fail)
    if (selectedImagesForPrompt.length > 0) {
      console.log('[App.jsx] Clearing selected prompt images after sending');
      // Clear each image from the prompt image state
      setSelectedImagesForPrompt([]);
      // Clear image upload status
      setPromptImageUploadStatus({});
    }

    // Clear ALL files from attachment area immediately (including PDFs)
    setFiles([]);

    // Pass tool override parameters to the backend
    try {
      await originalStartStreamChat(
        text,
        targetConvoId,
        initialConvoData,
        targetModelId,
        overrideEnableSearch,
        overrideEnableCodeExec,
        filesForMessage,
        overrideEnableFunctionCalling,
        overrideSelectedTools,
        signal // Pass the abort signal
      );
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[App.jsx] Request was aborted');
      } else {
        console.error('[App.jsx] Error in startStreamChat:', error);
      }
    } finally {
      setIsAppLoading(false);
      // Clear the AbortController after request completes or fails
      abortControllerRef.current = null;
    }
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

  // Handler to remove a file from attachments only (not from file manager)
  const handleRemoveAttachedFile = (fileId) => {
    setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
  };

  const clearSelectedImagesForPrompt = () => {
    setSelectedImagesForPrompt([]);
    setPromptImageUploadStatus({});
  };

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
    let shouldEnableSearch = false;
    let shouldEnableCodeExec = false;
    let shouldEnableFunctionCalling = false;
    
    console.log(`Prompt clicked. Tool usage: ${toolUsage}, Model: ${modelToUse}, Capabilities:`, capabilities);

    if (toolUsage === 'googleSearch') {
      if (capabilities.supportsSearch) {
        console.log("Activating Google Search for this prompt.");
        shouldEnableSearch = true;
        shouldEnableCodeExec = false;
        shouldEnableFunctionCalling = false;
      } else {
        console.warn(`Prompt requested Google Search, but model ${modelToUse} does not support it. Tool not enabled.`);
      }
    } else if (toolUsage === 'codeExecution') {
      if (capabilities.supportsCodeExecution) {
        console.log("Activating Code Execution for this prompt.");
        shouldEnableCodeExec = true;
        shouldEnableSearch = false;
        shouldEnableFunctionCalling = false;
      } else {
        console.warn(`Prompt requested Code Execution, but model ${modelToUse} does not support it. Tool not enabled.`);
      }
    } else if (toolUsage === 'imageGeneration') {
      console.log("Activating Function Calling (Image Generation) for this prompt.");
      shouldEnableFunctionCalling = true;
      shouldEnableSearch = false;
      shouldEnableCodeExec = false;
      // Ensure image generation tools are selected
      setSelectedTools(['generateImage', 'editImage']); // Use correct tool names
    } else {
      // If no specific tool usage, keep current settings but don't override
      console.log("No specific tool usage - keeping current settings.");
    }

    // Update the global state for Settings Panel UI consistency FIRST
    setEnableGoogleSearch(shouldEnableSearch);
    setEnableCodeExecution(shouldEnableCodeExec);
    setEnableFunctionCalling(shouldEnableFunctionCalling);
    
    // For image generation, ensure the right tools are selected
    if (shouldEnableFunctionCalling) {
      setSelectedTools(['generateImage', 'editImage']);
    } else if (shouldEnableSearch || shouldEnableCodeExec) {
      setSelectedTools([]); // Clear function calling tools when using other tools
    }
    
    setStreamToggleState(true); // Force stream toggle ON for suggested prompts

    if (window.innerWidth < 1024) closeSidebar();

    console.log(`Tool settings updated immediately. Starting chat with proper state...`);
    console.log(`Tool states - Search: ${shouldEnableSearch}, CodeExec: ${shouldEnableCodeExec}, FunctionCalling: ${shouldEnableFunctionCalling}`);
    
    // Use setImmediate or minimal timeout to ensure state updates are processed
    setTimeout(async () => {
      console.log(`🚀 Starting STREAM chat with prompt: "${promptText}" (Model: ${modelToUse})`);
      
      // ALWAYS use streaming for suggested prompts with explicit tool overrides
      await startStreamChat(
        promptText, 
        id, 
        initialConvoData, 
        modelToUse, 
        shouldEnableSearch,  // override search explicitly
        shouldEnableCodeExec, // override code execution explicitly
        null, // explicitFiles
        shouldEnableFunctionCalling, // override function calling explicitly
        shouldEnableFunctionCalling ? ['generateImage', 'editImage'] : [] // override selected tools explicitly
      );
    }, 50); // Very short delay just for React state batching 
  }, [models, currentModel, setCurrentModel, setEnableGoogleSearch, setEnableCodeExecution, setEnableFunctionCalling, setSelectedTools, setStreamToggleState, closeSidebar, startStreamChat]);

  // Function to load a saved live session
  const loadLiveSession = useCallback((resumeHandle, modality, voice, systemInstruction) => {
    if (!resumeHandle) {
      console.warn('No resume handle provided for session loading');
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
      startLiveSession();
    }, 300);
  }, [liveOpen, setLiveOpen, setLiveModality, setCurrentVoice, setLivePrompt, startLiveSession, setSessionResumeHandle]);

  // NEW: Function to start a live chat with the current main chat context
  const startLiveWithMainContext = useCallback(() => {
    // Check if there's an active conversation with messages
    if (!activeConvoId) {
      console.warn('No active conversation to start live chat with');
      return;
    }

    const activeConvo = convos.find(c => c.id === activeConvoId);
    if (!activeConvo || !activeConvo.messages || activeConvo.messages.length === 0) {
      console.warn('No messages in active conversation to start live chat with');
      return;
    }

    // Prepare a chat summary to send to the live session
    const recentMessages = activeConvo.messages.slice(-5); // Get last 5 messages
    const contextSummary = recentMessages.map(msg => 
      `${msg.role}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`
    ).join('\n');
    
    const contextPrompt = `Continue this conversation in live mode. Recent context:\n${contextSummary}\n\nPlease continue naturally from where we left off.`;
    
    // Set up live session with context
    setLivePrompt(contextPrompt);
    setLiveModality(['audio']); // Default to audio mode
    
    // Open live popup and start session
    setLiveOpen(true);
    
    // Mark that this session started with main context
    setSessionResumeHandle(null); // Clear any previous resume handle
    
    // Start the session after a brief delay for UI to update
    setTimeout(() => {
      startLiveSession();
    }, 300);
  }, [activeConvoId, convos, setLiveOpen, setLiveModality, setLivePrompt, startLiveSession, setSessionResumeHandle]);

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
            setCacheManagerOpen={setCacheManagerOpen}
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
                /> 
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
          
          {/* Chat Input Area */}
          <MessageInput
          onSend={sendToBackend}
          onStreamSend={startStreamChat}
          isLoading={isChatLoading}
          disabled={!activeConvoId}
          onFileManagerClick={() => setFileManagerOpen(true)} // For file management
          // --> ADD THESE PROPS FOR IMAGE SELECTION <--
          selectedImagesForPrompt={selectedImagesForPrompt}
          onSelectImagesForPrompt={handleSelectImagesForPrompt}
          onRemoveSelectedImage={handleRemoveSelectedImage}
          promptImageUploadStatus={promptImageUploadStatus} // Pass the status object
          // --> ADD THESE PROPS FOR FILE ATTACHMENTS <--
          attachedFiles={files}
          onRemoveAttachedFile={handleRemoveAttachedFile}
          onStopRequest={handleStopRequest}
          enableThinking={enableThinking}
          onToggleThinking={handleToggleThinking}
          enableTools={enableFunctionCalling}
          onToggleTools={handleToggleTools}
          thinkingBudget={thinkingBudget}
          isThinkingSupported={isThinkingSupportedByModel}
          onStartLiveChat={() => setLiveOpen(true)} // Add handler for live chat button
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

      {/* Plugin Manager */}
      {pluginManagerOpen && (
        <PluginManager
          isOpen={pluginManagerOpen}
          onClose={() => setPluginManagerOpen(false)}
          enableFunctionCalling={enableFunctionCalling}
          onEnableFunctionCallingChange={setEnableFunctionCalling}
          selectedTools={selectedTools}
          onSelectedToolsChange={setSelectedTools}
          functionCallingMode={functionCallingMode}
          onFunctionCallingModeChange={setFunctionCallingMode}
          isAuthenticated={isAuthenticated}
          user={userProfile}
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

      {/* File Manager Popup */}
      {fileManagerOpen && (
        <FileManager
          isOpen={fileManagerOpen}
          onClose={() => setFileManagerOpen(false)}
          onFileSelect={(selectedFiles, options = {}) => {
            // Add selected files to the current files state
            setFiles(prevFiles => {
              const newFiles = selectedFiles.filter(
                newFile => !prevFiles.some(existing => existing.id === newFile.id)
              );
              return [...prevFiles, ...newFiles];
            });
            
            // Store caching preference
            if (options.enableCaching !== undefined) {
              console.log('[App] File caching preference:', options.enableCaching);
              // You could store this in state or pass it to chat requests
            }
            
            // Close the FileManager after selecting files
            setFileManagerOpen(false);
          }}
        />
      )}

      {/* Cache Manager Popup */}
      {cacheManagerOpen && (
        <CacheManager
          isOpen={cacheManagerOpen}
          onClose={() => setCacheManagerOpen(false)}
        />
      )}

    </div>
  );
}