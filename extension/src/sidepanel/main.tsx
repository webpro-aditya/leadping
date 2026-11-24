import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from '../contexts/AuthContext';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import App from './App';
import '../styles/globals.css';

console.log('[LeadPing] Initializing LeadPing AI Side Panel...');

function mountApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('[LeadPing] Fatal: Target root element #root not found in DOM.');
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log('[LeadPing] Side panel mounted successfully.');
  } catch (err) {
    console.error('[LeadPing] Fatal error during React mount:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
