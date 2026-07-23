import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { classesApi } from '../services/classesService';

const CLASSES_KEY = ['classes'];
const SCHEDULE_CLEANUP_KEY = [...CLASSES_KEY, 'schedule-cleanup'];

export function useClassesList(params) {
  return useQuery({
    queryKey: [...CLASSES_KEY, 'list', params],
    queryFn: () => classesApi.list(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useClassesCalendar(params) {
  return useQuery({
    queryKey: [...CLASSES_KEY, 'calendar', params],
    queryFn: () => classesApi.getCalendar(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useClassesAvailability(params) {
  return useQuery({
    queryKey: [...CLASSES_KEY, 'availability', params],
    queryFn: () => classesApi.getAvailability(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useScheduleCleanupCandidates() {
  return useQuery({
    queryKey: SCHEDULE_CLEANUP_KEY,
    queryFn: () => classesApi.listScheduleCleanupCandidates(),
  });
}

export function useGenerateClasses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: classesApi.generate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASSES_KEY });
    },
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => classesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASSES_KEY });
    },
  });
}

export function useCancelFutureBySchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => classesApi.cancelFutureBySchedule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASSES_KEY });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}
