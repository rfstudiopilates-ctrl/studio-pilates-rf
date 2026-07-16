import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/dashboardService';

const DASHBOARD_KEY = ['dashboard'];

export function useDashboardOverview(params) {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, 'overview', params],
    queryFn: () => dashboardApi.getOverview(params),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function useDashboardToday() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, 'today'],
    queryFn: dashboardApi.getToday,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
