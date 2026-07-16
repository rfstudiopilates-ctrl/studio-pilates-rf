import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { classesApi } from '../services/classesService';

const CLASSES_KEY = ['classes'];

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
