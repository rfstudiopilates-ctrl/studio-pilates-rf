import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../services/notificationsService';

const NOTIFICATIONS_KEY = ['notifications'];

export function useVapidPublicKey() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'vapid'],
    queryFn: notificationsApi.getVapidPublicKey,
    staleTime: 5 * 60_000,
  });
}
