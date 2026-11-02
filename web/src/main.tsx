import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './lib/auth';
import './index.css';

function getBasename(): string {
  const base = import.meta.env.BASE_URL;
  if (base && base !== './' && base !== '/') {
    return base.endsWith('/') ? base.slice(0, -1) : base;
  }
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      return '/' + parts[0];
    }
  }
  return '';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={getBasename()}>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
