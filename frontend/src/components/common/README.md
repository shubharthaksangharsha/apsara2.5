# Common Components Directory

This directory contains shared utilities, constants, and components that are used throughout the UI.

## Contents

### Files

- `constants.js` - Shared constants used across components (breakpoints, animations, theme values)
- `utils.js` - Utility functions for common UI tasks (text formatting, className manipulation, etc.)

## Usage

### Constants

Import constants from this directory to maintain consistency across the UI:

```javascript
import { THEMES, ANIMATION } from '../common/constants';

// Use in component
const handleTransition = () => {
  return {
    transition: `all ${ANIMATION.DEFAULT} ease-in-out`,
  };
};
```

### Utilities

Import utility functions to handle common UI operations:

```javascript
import { truncateText, classNames } from '../common/utils';

// Example usage in a component
const MyComponent = ({ text, isActive }) => {
  return (
    <div className={classNames('base-class', { 'active-class': isActive })}>
      {truncateText(text, 50)}
    </div>
  );
};
```

## Best Practices

1. **Keep it DRY**: If you find yourself repeating the same utilities or constants in multiple components, consider moving them here.

2. **Be Selective**: Only add truly reusable elements to this directory. Component-specific utilities should remain with their respective components.

3. **Documentation**: When adding new utilities or constants, include JSDoc comments to explain purpose and usage.

4. **Testing**: Ensure utilities are pure functions that can be easily tested in isolation. 