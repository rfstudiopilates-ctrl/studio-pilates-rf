import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulesApi } from '../services/schedulesService';

const SCHEDULES_KEY = ['schedules'];

export function useWeeklySchedule() {
  return useQuery({
    queryKey: [...SCHEDULES_KEY, 'weekly'],
    queryFn: schedulesApi.getWeekly,
  });
}

export function useReplaceWeeklySchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: schedulesApi.replaceBulk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULES_KEY });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}
