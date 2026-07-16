import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import AppProviders from './app/providers';
import { setupAuthInterceptors } from './lib/setupAuthInterceptors';
import { initPwaListeners } from './lib/pwa';

setupAuthInterceptors();
initPwaListeners();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>
);
