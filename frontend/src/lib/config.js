const apiUrl = import.meta.env.VITE_API_URL || '/api';
const appName = import.meta.env.VITE_APP_NAME || 'Studio Pilates RF';

export const config = {
  apiUrl,
  appName,
  isDevelopment: import.meta.env.DEV,
};
