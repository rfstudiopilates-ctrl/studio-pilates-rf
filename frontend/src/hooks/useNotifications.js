import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../services/notificationsService';
import { useAuth } from './useAuth';
import { syncPushSubscriptionIfGranted } from '../lib/pushNotifications';

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

export function usePushStatus(options = {}) {
  const { isAuthenticated } = useAuth();
  const enabled = options.enabled !== false && isAuthenticated;

  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'push-status'],
    queryFn: notificationsApi.getPushStatus,
    enabled,
    staleTime: 15_000,
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

export function useClearNotificationsInbox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.clearInbox(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useSendTestPush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.sendTestPush(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

/**
 * Re-registra la suscripción push en este dispositivo si el permiso ya está dado.
 * Clave en iPhone: Safari y la PWA instalada son contextos distintos.
 */
export function useSyncPushSubscription() {
  const { isAuthenticated, accessToken } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const result = await syncPushSubscriptionIfGranted();
        if (!cancelled && result.ok) {
          queryClient.invalidateQueries({
            queryKey: [...NOTIFICATIONS_KEY, 'push-status'],
          });
        }
      } catch (error) {
        console.warn('[PUSH] No se pudo sincronizar la suscripción:', error.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, accessToken, queryClient]);
}
