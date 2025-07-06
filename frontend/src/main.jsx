import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Suppress the custom element redefinition error which happens in development
// due to hot module replacement or browser extensions
const originalError = console.error;
console.error = (...args) => {
  const errorMessage = args[0]?.toString() || '';
  if (errorMessage.includes('has already been defined') || 
      errorMessage.includes('mce-autosize-textarea')) {
    // Suppress this specific error
    return;
  }
  originalError.apply(console, args);
};

// Also handle uncaught errors
window.addEventListener('error', (event) => {
  const errorMessage = event.error?.message || event.message || '';
  if (errorMessage.includes('has already been defined') || 
      errorMessage.includes('mce-autosize-textarea')) {
    event.preventDefault();
    return false;
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
