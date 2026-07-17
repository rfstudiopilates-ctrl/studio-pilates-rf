import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../services/notificationsService';
import { useAuth } from './useAuth';

const NOTIFICATIONS_KEY = ['notifications'];

export function useVapidPublicKey() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'vapid'],
    queryFn: notificationsApi.getVapidPublicKey,
    staleTime: 5 * 60_000,
  });
}

export function useNotificationsInbox(options = {}) {
  const { isAuthenticated } = useAuth();
  const enabled = options.enabled !== false && isAuthenticated;

  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'inbox'],
    queryFn: () => notificationsApi.getInbox({ limit: 30 }),
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    staleTime: 10_000,
  });
}

export function useUnreadNotificationsCount(options = {}) {
  const { isAuthenticated } = useAuth();
  const enabled = options.enabled !== false && isAuthenticated;

  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'unread-count'],
    queryFn: notificationsApi.getUnreadCount,
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    staleTime: 10_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}
