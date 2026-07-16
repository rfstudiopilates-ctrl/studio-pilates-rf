import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financesApi } from '../services/financesService';

const FINANCES_KEY = ['finances'];

export function useClientFinances(clientId, params = {}) {
  return useQuery({
    queryKey: [...FINANCES_KEY, 'client', clientId, params],
    queryFn: () => financesApi.getClientFinances(clientId, params),
    enabled: Boolean(clientId),
  });
}

export function useMyAccount() {
  return useQuery({
    queryKey: [...FINANCES_KEY, 'me'],
    queryFn: financesApi.getMyAccount,
  });
}

export function useFinanceOverview(params = {}) {
  return useQuery({
    queryKey: [...FINANCES_KEY, 'overview', params],
    queryFn: () => financesApi.getOverview(params),
  });
}

export function useFinanceMovements(params = {}) {
  return useQuery({
    queryKey: [...FINANCES_KEY, 'movements', params],
    queryFn: () => financesApi.listMovements(params),
  });
}

export function useCreateMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, payload }) => financesApi.createMovement(clientId, payload),
    onSuccess: (_, _variables) => {
      queryClient.invalidateQueries({ queryKey: FINANCES_KEY });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useSettlePlanAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, payload }) => financesApi.settlePlanAssignment(clientId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCES_KEY });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
