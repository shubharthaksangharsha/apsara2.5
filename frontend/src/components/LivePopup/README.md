# LivePopup Component

A modal popup component for real-time interaction with AI via chat, audio, video, and screen sharing.

## Directory Structure

```
LivePopup/
├── index.jsx          # Main component
├── constants.js       # Constants and default values
├── README.md          # Documentation
└── components/        # Sub-components
    ├── CameraSelectorModal.jsx    # Camera selection modal
    ├── ControlPanel.jsx           # Control buttons panel
    ├── CreateEventModal.jsx       # Modal for creating calendar events
    ├── MessageHelpers.jsx         # Utility functions for message rendering
    ├── SaveSessionDialog.jsx      # Dialog for saving sessions
    ├── SettingsPanel.jsx          # Settings configuration panel
    └── TabBar.jsx                 # Tab navigation
```

## Usage

```jsx
import LivePopup from './components/LivePopup';

function App() {
  // State and handlers here...
  
  return (
    <div>
      {/* Other components */}
      
      <LivePopup
        isOpen={liveOpen}
        onClose={() => setLiveOpen(false)}
        models={models}
        selectedModel={currentModel}
        setSelectedModel={setCurrentModel}
        messages={messages}
        connectionStatus={connectionStatus}
        onSendMessage={handleSendMessage}
        isRecording={isRecording}
        isStreamingVideo={isStreamingVideo}
        isStreamingScreen={isStreamingScreen}
        mediaStream={mediaStream}
        screenStream={screenStream}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onStartVideo={handleStartVideo}
        onStopVideo={handleStopVideo}
        onStartScreenShare={handleStartScreenShare}
        onStopScreenShare={handleStopScreenShare}
        flipCamera={handleFlipCamera}
        voices={voices}
        currentVoice={currentVoice}
        onVoiceChange={handleVoiceChange}
        liveModality={liveModality}
        onModalityChange={handleModalityChange}
        liveSystemInstruction={liveSystemInstruction}
        onSystemInstructionChange={handleSystemInstructionChange}
        transcriptionEnabled={transcriptionEnabled}
        setTranscriptionEnabled={setTranscriptionEnabled}
        slidingWindowEnabled={slidingWindowEnabled}
        setSlidingWindowEnabled={setSlidingWindowEnabled}
        slidingWindowTokens={slidingWindowTokens}
        setSlidingWindowTokens={setSlidingWindowTokens}
        nativeAudioFeature={nativeAudioFeature}
        onNativeAudioFeatureChange={handleNativeAudioFeatureChange}
        mediaResolution={mediaResolution}
        onMediaResolutionChange={handleMediaResolutionChange}
        mapData={mapData}
        sessionHandle={currentSessionHandle}
        onSaveSession={handleSaveSession}
      />
    </div>
  );
}
```

## Features

- Real-time chat with AI
- Audio and video interaction
- Screen sharing capability
- Multiple view tabs (Chat, Code, Map, Calendar, Weather)
- Settings configuration
- Session management
- Camera device selection
- Media stream visualization
- Calendar event creation
- Responsive design for different screen sizes

## Dependencies

- React
- Lucide icons
- VideoStreamDisplay component
- ScreenShareDisplay component 