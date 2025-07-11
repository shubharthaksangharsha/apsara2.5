# SettingsPanel Component

The SettingsPanel component provides a slide-out panel for configuring chat behavior settings including system instructions, temperature, token limits, and feature toggles.

## Usage

```jsx
import SettingsPanel from '../components/SettingsPanel';

// Inside your component
<SettingsPanel
  currentModel={currentModel}
  isSystemInstructionApplicable={isSystemInstructionApplicable}
  systemInstruction={systemInstruction}
  onSystemInstructionChange={handleSystemInstructionSave}
  temperature={temperature}
  onTemperatureChange={setTemperature}
  maxOutputTokens={maxOutputTokens}
  onMaxOutputTokensChange={setMaxOutputTokens}
  enableGoogleSearch={enableGoogleSearch}
  onEnableGoogleSearchChange={setEnableGoogleSearch}
  enableCodeExecution={enableCodeExecution}
  onEnableCodeExecutionChange={setEnableCodeExecution}
  enableThinking={enableThinking}
  onEnableThinkingChange={setEnableThinking}
  thinkingBudget={thinkingBudget}
  onThinkingBudgetChange={setThinkingBudget}
  isSearchSupported={isSearchSupportedByModel}
  isCodeExecutionSupported={isCodeExecutionSupportedByModel}
  isThinkingSupported={isThinkingSupportedByModel}
  isThinkingBudgetSupported={isThinkingBudgetSupportedByModel}
  isOpen={settingsOpen}
  onClose={() => setSettingsOpen(false)}
/>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `currentModel` | String | ID of the currently selected model |
| `isSystemInstructionApplicable` | Boolean | Whether system instructions are applicable for the current model |
| `systemInstruction` | String | Current system instruction |
| `onSystemInstructionChange` | Function | Handler for saving system instruction changes |
| `temperature` | Number | Current temperature value (0-1) |
| `onTemperatureChange` | Function | Handler for temperature changes |
| `maxOutputTokens` | Number | Current max output tokens value |
| `onMaxOutputTokensChange` | Function | Handler for max output tokens changes |
| `enableGoogleSearch` | Boolean | Whether Google search is enabled |
| `onEnableGoogleSearchChange` | Function | Handler for Google search toggle |
| `enableCodeExecution` | Boolean | Whether code execution is enabled |
| `onEnableCodeExecutionChange` | Function | Handler for code execution toggle |
| `enableThinking` | Boolean | Whether thinking process is enabled |
| `onEnableThinkingChange` | Function | Handler for thinking process toggle |
| `thinkingBudget` | Number | Current thinking budget value |
| `onThinkingBudgetChange` | Function | Handler for thinking budget changes |
| `isSearchSupported` | Boolean | Whether search is supported by the current model |
| `isCodeExecutionSupported` | Boolean | Whether code execution is supported by the current model |
| `isThinkingSupported` | Boolean | Whether thinking process is supported by the current model |
| `isThinkingBudgetSupported` | Boolean | Whether thinking budget is supported by the current model |
| `isOpen` | Boolean | Whether the panel is open |
| `onClose` | Function | Handler for closing the panel |

## Structure

- `index.jsx` - Main component implementation
- `constants.js` - Component-specific constants
- `components/` - Subcomponents
  - `SystemInstructionField.jsx` - System instruction textarea
  - `TemperatureControl.jsx` - Temperature slider
  - `MaxOutputTokensControl.jsx` - Max output tokens input
  - `FeatureToggle.jsx` - Reusable feature toggle switch
  - `ThinkingBudgetControl.jsx` - Thinking budget slider

## Features

- Slide-in/out animation with backdrop
- Responsive design for mobile and desktop
- Contextual controls based on model capabilities
- Mutual exclusivity between Google Search and Code Execution
