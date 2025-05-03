import React, { useState, useEffect, useCallback } from 'react';
import { BellRing, FileUp, Menu, Mic, Moon, Send, Settings, Sun, User, X, MessageSquare, UploadCloud, AudioLines, Cog, Trash2, MicOff, BrainCircuit, Image as ImageIcon, BookOpen, Link as LinkIcon, UserIcon, Code, Sparkles, Plane, UtensilsCrossed, History, Film, PenTool, Globe, FileText, Lightbulb, Target, Search } from 'lucide-react';

// Import the new components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import SettingsPanel from './components/SettingsPanel';
import LivePopup from './components/LivePopup';
import EmptyChatContent from './components/EmptyChatContent'; // Import the new component
import FileUploadPopup from './components/FileUploadPopup';

// Import the custom hook
import { useTheme } from './hooks/useTheme';
import { useAppSettings } from './hooks/useAppSettings';
import { useConversations } from './hooks/useConversations';
import { useChatApi } from './hooks/useChatApi';
import { useFileUpload } from './hooks/useFileUpload';
import { useLiveSession } from './hooks/useLiveSession';
import { getModelCapabilities } from './utils/modelCapabilities'; // Import capability checker

const BACKEND_URL = 'http://localhost:9000';

const MAX_LOCALSTORAGE_SIZE_MB = 4.5; // Set a limit slightly below 5MB
const BYTES_PER_MB = 1024 * 1024;
const MAX_STORAGE_BYTES = MAX_LOCALSTORAGE_SIZE_MB * BYTES_PER_MB;

// Define suggested prompts with optional target models and tool usage
const suggestedPrompts = [
  // Technical & Coding (Using Pro for complexity/accuracy & Code Execution)
  { text: "Explain the concept of closures in JavaScript", icon: BrainCircuit, modelId: "gemini-2.5-pro-exp-03-25"},
  { text: "Generate and execute Python code to print a random number (1-10)", icon: Code, modelId: "gemini-2.0-flash", toolUsage: 'codeExecution' },
  { text: "Debug this SQL query:\nSELECT user, COUNT(*) FROM orders GROUP BY product;", icon: Code, modelId: "gemini-2.0-flash", toolUsage: 'codeExecution' },
  { text: "What are the main differences between React and Vue?", icon: BrainCircuit },

  // Creative & Writing (Using Flash for speed/versatility)
  { text: "Write a short poem about a rainy day", icon: PenTool, modelId: "gemini-1.5-flash" },
  { text: "Generate a marketing slogan for a new coffee shop", icon: Sparkles, modelId: "gemini-1.5-flash" },
  { text: "Write a short story about a space explorer finding a new planet", icon: BookOpen, modelId: "gemini-1.5-flash" },

  // Image Generation (Using 2.0 Flash Image variant)
  { text: "Generate an image of a futuristic cityscape at sunset", icon: ImageIcon, modelId: "gemini-2.0-flash-exp-image-generation" },
  { text: "Generate an image of a cat wearing sunglasses", icon: ImageIcon, modelId: "gemini-2.0-flash-exp-image-generation" },

  // Planning & Practical (Using Flash)
  { text: "Create a recipe for vegan lasagna", icon: UtensilsCrossed, modelId: "gemini-1.5-flash" },
  { text: "Plan a 3-day weekend trip to London", icon: Plane, modelId: "gemini-1.5-flash" },
  { text: "Suggest some fun team-building activities for a remote team", icon: Sparkles, modelId: "gemini-1.5-flash" },
  { text: "Draft an email asking for a project extension", icon: FileText, modelId: "gemini-1.5-flash" },

  // Knowledge & Explanation (Mix based on potential complexity)

  { text: "Provide tips for improving public speaking skills", icon: BookOpen, modelId: "gemini-1.5-flash" },
  { text: "Explain the concept of blockchain technology simply", icon: Globe, modelId: "gemini-1.5-flash" },
  { text: "Summarize the main events of World War II", icon: History, modelId: "gemini-2.5-pro-exp-03-25" },
  { text: "What is the plot of the movie 'Inception'?", icon: Film, modelId: "gemini-1.5-flash" },
  { text: "Give me ideas for a challenging programming project", icon: Lightbulb, modelId: "gemini-1.5-flash"},
  { text: "Search for recent news about AI developments", icon: Search, modelId: "gemini-2.0-flash", toolUsage: 'googleSearch' },
  { text: "What is the Current date and time", icon: Search, modelId: "gemini-2.0-flash", toolUsage: 'googleSearch' },
];
            
// Main App component                                                                                                            
export default function App() {
  // Theme - Use the custom hook
  const [darkMode, setDarkMode] = useTheme();

  // State for initial data loading (consider moving fetch logic into a hook too)
  const [models, setModels] = useState([]);
  const [voices, setVoices] = useState([]);
  const [initialSystemInstruction, setInitialSystemInstruction] = useState(null); // Start null, fetch it
  const [initialFiles, setInitialFiles] = useState([]); // Start empty, fetch them
  const [dataLoading, setDataLoading] = useState(true); // Track initial data load

  const {
    convos,
    setConvos, // Still needed by useChatApi
    activeConvoId,
    setActiveConvoId,
    handleNewChat: createNewChat, // Rename for clarity
    handleDeleteChat,
    handleDeleteAllChats,
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
    isSystemInstructionApplicable,
    isSearchSupportedByModel,
    isCodeExecutionSupportedByModel,
  } = useAppSettings(initialSystemInstruction ?? 'You are a helpful assistant.'); // Pass fetched instruction

  const {
    files,
    // setFiles, // Allow direct set for initial load
    uploadFile,
  } = useFileUpload(initialFiles); // Pass fetched files

  const {
    isLoading: isChatLoading, // Rename to avoid conflict if dataLoading is used
    // streamingModelMessageId, // Not directly used in App UI
    sendToBackend,
    startStreamChat,
  } = useChatApi({ // Pass dependencies
    convos, setConvos, activeConvoId, setActiveConvoId, // From useConversations
    currentModel, temperature, maxOutputTokens, enableGoogleSearch, enableCodeExecution, systemInstruction, isSystemInstructionApplicable // From useAppSettings
  });

  const {
    // Live State
    liveMessages,
    liveConnectionStatus,
    liveModality,
    liveSystemInstruction: currentLiveSystemInstruction, // Rename for clarity
    isModelSpeaking,
    isRecording,
    audioError,
    // Live Handlers/Setters
    setLiveModality,
    setLiveSystemInstruction: setLivePrompt, // Rename for clarity
    startLiveSession,
    endLiveSession,
    sendLiveMessage,
    startRecording,
    stopRecording,
  } = useLiveSession({ currentVoice }); // Pass dependencies

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
        // Also update the live prompt default if needed
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
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden transition-all duration-500 ease-in-out bg-gray-100 dark:bg-gray-900"> {/* Ensure main bg color */}
        {/* Header - Use Imported Component */}
        <Header
          models={models}
          currentModel={currentModel}
          setCurrentModel={setCurrentModel}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          setLiveOpen={setLiveOpen}
          setSettingsOpen={setSettingsOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
        
        {/* Chat Messages Area */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 pb-0 bg-gray-100 dark:bg-gray-900 custom-scrollbar"> {/* Added flex flex-col */}
          {!activeConvoId ? (
            // No active chat: Show full Welcome Screen
            <WelcomeScreen
              allPrompts={suggestedPrompts} // Pass the full list
              onStartChatWithPrompt={startChatWithPrompt}
              onStartNewChat={handleStartNewChat}
            />
          ) : (
            // Active chat exists: Check for messages
            (() => {
              const activeConvo = convos.find(c => c.id === activeConvoId);
              if (activeConvo && activeConvo.messages && activeConvo.messages.length > 0) {
                // Ensure ChatWindow doesn't cause remounts if its key changes unnecessarily
                return <ChatWindow key={activeConvoId} convo={activeConvo} />; 
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
        
        {/* Message Input - Use Imported Component */}
        <MessageInput
          onSend={sendToBackend}
          onStreamSend={startStreamChat}
          isLoading={isChatLoading}
          disabled={!activeConvoId}
          onFileUploadClick={() => setFileUploadOpen(true)}
          streamEnabled={streamToggleState} // Pass state down
          onStreamToggleChange={setStreamToggleState} // Pass handler down
        />
      </main>

      {/* Settings Panel - Use Imported Component */}
      {settingsOpen && (
        <SettingsPanel
          currentModel={currentModel}
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
        />
      )}

      {/* Live Chat Popup - Use Imported Component */}
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
        />
      )}

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