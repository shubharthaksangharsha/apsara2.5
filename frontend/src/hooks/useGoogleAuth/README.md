# useGoogleAuth Hook

This hook manages Google Authentication for the application, handling sign-in, sign-out, and auth status checking.

## Directory Structure

```
useGoogleAuth/
├── index.js        # Main hook entrypoint
├── constants.js    # API constants
├── auth-api.js     # Authentication API functions
├── storage-utils.js # Local storage utilities
└── README.md       # Documentation
```

## Usage

```jsx
import { useGoogleAuth } from '../hooks/useGoogleAuth';

function MyComponent() {
  const {
    isAuthenticated,    // Boolean indicating if user is authenticated
    userProfile,        // User profile data if authenticated
    isAuthLoading,      // Boolean indicating if auth check is in progress
    signIn,             // Function to initiate Google sign-in
    signOut,            // Function to sign out
    skipAuth,           // Function to skip authentication
    wasAuthSkipped      // Function to check if auth was skipped
  } = useGoogleAuth();

  if (isAuthLoading) {
    return <div>Loading authentication status...</div>;
  }

  if (isAuthenticated) {
    return (
      <div>
        <h1>Welcome, {userProfile?.name || 'User'}!</h1>
        <button onClick={signOut}>Sign Out</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={signIn}>Sign In with Google</button>
      <button onClick={skipAuth}>Continue without signing in</button>
    </div>
  );
}
```

## API Reference

### Hook Return Values

- `isAuthenticated` - Boolean indicating if user is authenticated
- `userProfile` - User profile data if authenticated
- `isAuthLoading` - Boolean indicating if auth check is in progress
- `signIn` - Function to initiate Google sign-in
- `signOut` - Function to sign out
- `skipAuth` - Function to skip authentication
- `wasAuthSkipped` - Function to check if auth was skipped

### Authentication Flow

The hook handles the entire authentication flow:

1. On mount, checks if the user is already authenticated
2. Persists authentication state to localStorage for persistence
3. Handles auth redirects from Google OAuth
4. Provides sign-in and sign-out functionality
5. Allows skipping authentication for certain use cases

### User Profile Structure

When authenticated, the `userProfile` object contains:

```js
{
  id: "123456789",
  name: "John Doe",
  email: "john.doe@example.com",
  picture: "https://...", // URL to profile picture (if available)
  _hasPicture: true, // Flag indicating if user has a profile picture
  // Other fields from Google profile...
}
``` 