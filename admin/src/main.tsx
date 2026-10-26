import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { isFirebaseConfigValid } from './firebase';
import { ConfigErrorScreen } from './components/common/ConfigErrorScreen';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {!isFirebaseConfigValid ? (
      <ConfigErrorScreen />
    ) : (
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    )}
  </React.StrictMode>
);
