# ModelSelector Component

A component for selecting and displaying information about available AI models in the Apsara 2.5 application.

## Features

- Fetches available models from the API
- Fallbacks to predefined models if API fails
- Displays model capabilities as badges (Native Audio, Thinking)
- Shows detailed model information in a tooltip
- Auto-refreshes model list every 5 minutes
- Handles edge cases like API failures gracefully

## Structure

The component is structured as follows:

```
ModelSelector/
├── components/              # Subcomponents
│   ├── ModelBadges.jsx      # Displays capability badges
│   └── ModelTooltip.jsx     # Shows detailed model information
├── constants.js             # Fallback models and helper functions
├── index.jsx                # Main component
└── README.md                # Documentation
```

## Usage

```jsx
import ModelSelector from '../components/ModelSelector';

// In your component
const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-preview-native-audio-dialog');

// In your JSX
<ModelSelector 
  selectedModel={selectedModel}
  onSelectModel={setSelectedModel}
  disabled={isLoading} // Optional
/>
```

## Props

- `selectedModel` (string): The currently selected model ID
- `onSelectModel` (function): Handler function called when user selects a new model
- `disabled` (boolean, optional): Whether the selector should be disabled (default: false)

## Model Data Format

Each model object has the following structure:

```js
{
  id: 'model-id-string',
  name: 'Display Name',
  description: 'Description of the model capabilities',
  features: ['Feature 1', 'Feature 2', ...], // Optional array of features
  isDefault: false // Optional boolean to mark default model
}
```

## Helper Functions

The component exports several helper functions that can be imported and used:

- `modelSupportsNativeAudio(modelId)`: Returns true if the model supports native audio
- `modelSupportsThinking(modelId)`: Returns true if the model supports thinking capabilities
- `getModelCapabilities(modelId)`: Returns an object with all capabilities of a model

```jsx
import { getModelCapabilities } from '../components/ModelSelector/constants';

// Example usage
const capabilities = getModelCapabilities(selectedModel);
if (capabilities.nativeAudio) {
  // Enable audio features
}
``` 