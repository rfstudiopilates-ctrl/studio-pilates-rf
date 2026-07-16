import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scheduleChangesApi } from '../services/scheduleChangesService';

const SCHEDULE_CHANGES_KEY = ['schedule-changes'];

export function useMyScheduleChanges(params) {
  return useQuery({
    queryKey: [...SCHEDULE_CHANGES_KEY, 'me', params],
    queryFn: () => scheduleChangesApi.listMine(params),
  });
}

export function useCreateScheduleChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: scheduleChangesApi.createMine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_CHANGES_KEY });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

export function useCancelScheduleChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: scheduleChangesApi.cancelMine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_CHANGES_KEY });
    },
  });
}

export function useScheduleChangesList(params) {
  return useQuery({
    queryKey: [...SCHEDULE_CHANGES_KEY, 'list', params],
    queryFn: () => scheduleChangesApi.list(params),
    placeholderData: (previousData) => previousData,
  });
}

export function usePendingScheduleChangesCount() {
  return useQuery({
    queryKey: [...SCHEDULE_CHANGES_KEY, 'pending-count'],
    queryFn: scheduleChangesApi.getPendingCount,
    refetchInterval: 60_000,
  });
}

export function useApproveScheduleChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => scheduleChangesApi.approve(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_CHANGES_KEY });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

export function useRejectScheduleChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => scheduleChangesApi.reject(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_CHANGES_KEY });
    },
  });
}

export function useAdminReassignReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: scheduleChangesApi.reassign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_CHANGES_KEY });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}
