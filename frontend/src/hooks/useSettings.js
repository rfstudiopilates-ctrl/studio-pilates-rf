import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applyStudioTheme } from '../lib/colors';
import { settingsApi } from '../services/settingsService';

const PUBLIC_SETTINGS_KEY = ['settings', 'public'];
const ADMIN_SETTINGS_KEY = ['settings', 'admin'];

export function usePublicSettings() {
  return useQuery({
    queryKey: PUBLIC_SETTINGS_KEY,
    queryFn: settingsApi.getPublic,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: ADMIN_SETTINGS_KEY,
    queryFn: settingsApi.getAdmin,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.update,
    onSuccess: (data) => {
      queryClient.setQueryData(ADMIN_SETTINGS_KEY, data.settings);
      queryClient.setQueryData(PUBLIC_SETTINGS_KEY, {
        studioName: data.settings.studioName,
        logoUrl: data.settings.logoUrl,
        primaryColor: data.settings.primaryColor,
        secondaryColor: data.settings.secondaryColor,
        accentColor: data.settings.accentColor,
        backgroundColor: data.settings.backgroundColor,
      });
      applyStudioTheme(data.settings);
    },
  });
}

export { PUBLIC_SETTINGS_KEY, ADMIN_SETTINGS_KEY };
