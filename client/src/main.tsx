import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Failed to find the root element');
  throw new Error('Failed to find the root element');
}

try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Error rendering app:', error);
  // Show a user-friendly error message
  rootElement.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
      text-align: center;
      padding: 20px;
    ">
      <h1 style="color: #ef4444; margin-bottom: 16px;">Something went wrong</h1>
      <p style="color: #6b7280; margin-bottom: 24px;">
        We're sorry, but there was an error loading the application.
        Please try refreshing the page.
      </p>
      <button
        onclick="window.location.reload()"
        style="
          background-color: #3b82f6;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
        "
      >
        Refresh Page
      </button>
    </div>
  `;
}
