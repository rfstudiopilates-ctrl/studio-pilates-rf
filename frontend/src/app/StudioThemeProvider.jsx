import { useEffect } from 'react';
import { applyStudioTheme } from '../lib/colors';
import { usePublicSettings } from '../hooks/useSettings';

export default function StudioThemeProvider({ children }) {
  const { data: settings } = usePublicSettings();

  useEffect(() => {
    if (settings) {
      applyStudioTheme(settings);
    }
  }, [settings]);

  return children;
}
