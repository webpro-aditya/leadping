import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from '../contexts/AuthContext';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import Popup from './Popup';
import '../styles/globals.css';

function mountPopup() {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <Popup />
        </AuthProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountPopup);
} else {
  mountPopup();
}
