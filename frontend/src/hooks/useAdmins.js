import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminsApi } from '../services/adminsService';

const ADMINS_KEY = ['admins'];

export function useAdminsList(params = {}, options = {}) {
  return useQuery({
    queryKey: [...ADMINS_KEY, 'list', params],
    queryFn: () => adminsApi.list(params),
    placeholderData: (previous) => previous,
    ...options,
  });
}

export function useCreateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => adminsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMINS_KEY });
    },
  });
}

export function useUpdateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => adminsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMINS_KEY });
    },
  });
}

export function useDeactivateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => adminsApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMINS_KEY });
    },
  });
}
