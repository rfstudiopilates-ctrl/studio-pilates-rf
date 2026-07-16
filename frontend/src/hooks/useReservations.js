import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reservationsApi } from '../services/reservationsService';

const RESERVATIONS_KEY = ['reservations'];

export function useMyReservations(params) {
  return useQuery({
    queryKey: [...RESERVATIONS_KEY, 'me', params],
    queryFn: () => reservationsApi.listMine(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useMyRecoveryCredits() {
  return useQuery({
    queryKey: [...RESERVATIONS_KEY, 'me', 'recovery-credits'],
    queryFn: reservationsApi.getRecoveryCredits,
  });
}

export function useMyRecurring() {
  return useQuery({
    queryKey: [...RESERVATIONS_KEY, 'me', 'recurring'],
    queryFn: reservationsApi.listMyRecurring,
  });
}

export function useCreateMyReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reservationsApi.createMine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}

export function useCancelMyReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => reservationsApi.cancelMine(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}

export function useReservationsList(params) {
  return useQuery({
    queryKey: [...RESERVATIONS_KEY, 'list', params],
    queryFn: () => reservationsApi.list(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useClassReservations(classId) {
  return useQuery({
    queryKey: [...RESERVATIONS_KEY, 'class', classId],
    queryFn: () => reservationsApi.listByClass(classId),
    enabled: Boolean(classId),
  });
}

export function useClientReservations(clientId, params) {
  return useQuery({
    queryKey: [...RESERVATIONS_KEY, 'client', clientId, params],
    queryFn: () => reservationsApi.listByClient(clientId, params),
    enabled: Boolean(clientId),
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reservationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useConfirmReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input) => {
      const id = typeof input === 'object' && input != null ? input.id : input;
      const payload =
        typeof input === 'object' && input != null ? input.payload || {} : {};
      return reservationsApi.confirm(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => reservationsApi.cancel(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useClientRecurring(clientId) {
  return useQuery({
    queryKey: [...RESERVATIONS_KEY, 'recurring', clientId],
    queryFn: () => reservationsApi.listRecurringByClient(clientId),
    enabled: Boolean(clientId),
  });
}

export function useCreateRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reservationsApi.createRecurring,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useUpdateRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => reservationsApi.updateRecurring(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}
