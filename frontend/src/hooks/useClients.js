import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../services/clientsService';

const CLIENTS_KEY = ['clients'];

export function useClientsList(params, options = {}) {
  return useQuery({
    queryKey: [...CLIENTS_KEY, 'list', params],
    queryFn: () => clientsApi.list(params),
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

export function useClientDetail(id, historyParams = {}) {
  return useQuery({
    queryKey: [...CLIENTS_KEY, 'detail', id, historyParams],
    queryFn: () => clientsApi.getById(id, historyParams),
    enabled: Boolean(id),
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEY });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => clientsApi.update(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEY });
      queryClient.invalidateQueries({ queryKey: [...CLIENTS_KEY, 'detail', variables.id] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clientsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEY });
    },
  });
}
