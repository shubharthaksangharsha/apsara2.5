import React, { useState, useEffect, useCallback } from 'react';
import { BellRing, FileUp, Menu, Mic, Moon, Send, Settings, Sun, User, X, MessageSquare, UploadCloud, AudioLines, Cog, Trash2, MicOff, BrainCircuit, Image as ImageIcon, BookOpen, Link as LinkIcon, UserIcon } from 'lucide-react';

// Import the new components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import SettingsPanel from './components/SettingsPanel';
import LivePopup from './components/LivePopup';
import FileUploadPopup from './components/FileUploadPopup';

// Import the custom hook
import { useTheme } from './hooks/useTheme';
import { useAppSettings } from './hooks/useAppSettings';
import { useConversations } from './hooks/useConversations';
import { useChatApi } from './hooks/useChatApi';
import { useFileUpload } from './hooks/useFileUpload';
import { useLiveSession } from './hooks/useLiveSession';

const BACKEND_URL = 'http://localhost:9000';

const MAX_LOCALSTORAGE_SIZE_MB = 4.5; // Set a limit slightly below 5MB
const BYTES_PER_MB = 1024 * 1024;
const MAX_STORAGE_BYTES = MAX_LOCALSTORAGE_SIZE_MB * BYTES_PER_MB;

// Define suggested prompts with optional target models
const suggestedPrompts = [
  { text: "Explain quantum computing simply", icon: BrainCircuit },
  { text: "Write a Python script for web scraping", icon: BrainCircuit, modelId: "gemini-2.5-pro-exp-03-25" }, // Example specific model
  { text: "Create a recipe for vegan lasagna", icon: BookOpen },
  { text: "Generate an image of a futuristic cityscape at sunset", icon: ImageIcon, modelId: "gemini-2.0-flash-exp-image-generation" },
  { text: "Summarize the theory of relativity", icon: BookOpen },
  { text: "Plan a 5-day itinerary for Tokyo", icon: BookOpen },
  { text: "Generate an image of a cat wearing sunglasses", icon: ImageIcon, modelId: "gemini-2.0-flash-exp-image-generation" },
  { text: "Debug this Javascript code snippet:\n```javascript\nfunction greet(name) {\n console.log(Hello, + name)\n}\n```", icon: BrainCircuit, modelId: "gemini-2.5-pro-preview-03-25" },
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
  const startChatWithPrompt = useCallback(async (promptText, targetModelId = null) => {
    const id = Date.now().toString();
    const title = promptText.length > 30 ? promptText.substring(0, 30) + '...' : promptText;
    const initialConvoData = { id, title, messages: [] };

    // Optimistically set model if specified
    if (targetModelId && models.some(m => m.id === targetModelId)) {
      setCurrentModel(targetModelId);
    } else if (targetModelId) {
      targetModelId = currentModel; // Fallback if invalid target
                    } else {
       targetModelId = currentModel;
    }

    if (window.innerWidth < 1024) closeSidebar();

    console.log(`Starting chat with prompt: "${promptText}" (Model: ${targetModelId})`);
    const streamToggle = document.getElementById('streamToggleInput'); // Check streaming toggle state

    if (streamToggle?.checked) {
      await startStreamChat(promptText, id, initialConvoData, targetModelId);
     } else {
      await sendToBackend(promptText, id, initialConvoData, targetModelId);
    }
  }, [models, currentModel, setCurrentModel, closeSidebar, startStreamChat, sendToBackend]); // Dependencies

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
        <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900 custom-scrollbar"> {/* Added custom-scrollbar */}
          {activeConvoId && convos.find(c => c.id === activeConvoId) ? (
            <ChatWindow convo={convos.find(c => c.id === activeConvoId)} />
          ) : (
            // Welcome Screen - Use Imported Component
            <WelcomeScreen
              onStartChatWithPrompt={startChatWithPrompt}
              suggestedPrompts={suggestedPrompts}
              onStartNewChat={handleStartNewChat}
            />
          )}
        </div>
        
        {/* Message Input - Use Imported Component */}
        <MessageInput
          onSend={sendToBackend}
          onStreamSend={startStreamChat}
          isLoading={isChatLoading}
          disabled={!activeConvoId}
          onFileUploadClick={() => setFileUploadOpen(true)}
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