# useTheme Hook

A simple hook for managing dark/light theme preference with localStorage persistence.

## Directory Structure

```
useTheme/
├── index.js        # Main hook entrypoint
├── theme-utils.js  # Theme utility functions
└── README.md       # Documentation
```

## Usage

```jsx
import { useTheme } from '../hooks/useTheme';

function MyComponent() {
  const [darkMode, setDarkMode] = useTheme();

  return (
    <div>
      <button onClick={() => setDarkMode(!darkMode)}>
        Toggle {darkMode ? 'Light' : 'Dark'} Mode
      </button>
    </div>
  );
}
```

## API Reference

### Hook Return Values

The hook returns a tuple (array) with two elements:

- `darkMode` (boolean) - Current theme state (true = dark mode, false = light mode)
- `setDarkMode` (function) - Function to update the theme state

### Behavior

- Theme preference is persisted to localStorage
- On first visit with no saved preference, system preference is used
- The hook automatically applies the appropriate CSS class to the document root element 