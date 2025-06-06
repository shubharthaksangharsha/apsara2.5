# useAppSettings Hook

This hook manages application settings, model capabilities, and persistent storage of user preferences.

## Directory Structure

```
useAppSettings/
├── index.js             # Main hook entrypoint
├── constants.js         # Configuration constants
├── settings-persistence.js # LocalStorage management utilities
├── capabilities-utils.js # Model capabilities utilities
└── README.md            # Documentation
```

## Usage

```jsx
import { useAppSettings } from '../hooks/useAppSettings';

function MyComponent() {
  // Hook configuration
  const {
    // State values
    currentModel,
    currentVoice,
    systemInstruction,
    temperature,
    maxOutputTokens,
    enableGoogleSearch,
    enableCodeExecution,
    enableThinking,
    thinkingBudget,

    // Setters
    setCurrentModel,
    setCurrentVoice,
    setSystemInstruction,
    handleSystemInstructionSave,
    setTemperature,
    setMaxOutputTokens,
    setEnableGoogleSearch,
    setEnableCodeExecution,
    setEnableThinking,
    setThinkingBudget,

    // Capability flags
    isSystemInstructionApplicable,
    isSearchSupportedByModel,
    isCodeExecutionSupportedByModel,
    isThinkingSupportedByModel,
    isThinkingBudgetSupportedByModel,
  } = useAppSettings(initialSystemInstruction);

  return (
    <div>
      {/* Component content */}
    </div>
  );
}
```

## API Reference

### Hook Return Values

#### State Values
- `currentModel` - Current selected model ID
- `currentVoice` - Current selected voice for TTS
- `systemInstruction` - System instruction text
- `temperature` - Model temperature setting (0.0-1.0)
- `maxOutputTokens` - Maximum output tokens
- `enableGoogleSearch` - Whether Google Search is enabled
- `enableCodeExecution` - Whether Code Execution is enabled
- `enableThinking` - Whether thinking is enabled
- `thinkingBudget` - Thinking budget (tokens)

#### Setters
- `setCurrentModel` - Update current model
- `setCurrentVoice` - Update current voice
- `setSystemInstruction` - Direct setter for system instruction
- `handleSystemInstructionSave` - Handler for saving system instruction
- `setTemperature` - Update temperature
- `setMaxOutputTokens` - Update max output tokens
- `setEnableGoogleSearch` - Toggle Google Search
- `setEnableCodeExecution` - Toggle Code Execution
- `setEnableThinking` - Toggle thinking
- `setThinkingBudget` - Update thinking budget

#### Capability Flags
- `isSystemInstructionApplicable` - Whether system instructions are supported
- `isSearchSupportedByModel` - Whether search is supported
- `isCodeExecutionSupportedByModel` - Whether code execution is supported
- `isThinkingSupportedByModel` - Whether thinking is supported
- `isThinkingBudgetSupportedByModel` - Whether thinking budget is supported

## Persistence

Settings are automatically persisted to localStorage when changed, and loaded on initialization. Tool settings (search, code execution) are not persisted to ensure fresh user selection each time. 