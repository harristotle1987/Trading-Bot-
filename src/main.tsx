import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress ResizeObserver errors in development
window.addEventListener('error', e => {
  if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
    e.stopImmediatePropagation();
  }
});

const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('ResizeObserver loop completed with undelivered notifications.')) return;
  originalError.call(console, ...args);
};

const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && (args[0].includes('Vite\'s Node API is deprecated') || args[0].includes('Vite CJS'))) return;
  originalWarn.call(console, ...args);
};

const originalLog = console.log;
console.log = (...args) => {
  if (typeof args[0] === 'string' && (args[0].includes('Vite\'s Node API is deprecated') || args[0].includes('Vite CJS'))) return;
  originalLog.call(console, ...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
