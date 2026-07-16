import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { plansApi } from '../services/plansService';

const PLANS_KEY = ['plans'];

export function usePlansList(params) {
  return useQuery({
    queryKey: [...PLANS_KEY, 'list', params],
    queryFn: () => plansApi.list(params),
    placeholderData: (previousData) => previousData,
  });
}

export function usePlanDetail(id) {
  return useQuery({
    queryKey: [...PLANS_KEY, 'detail', id],
    queryFn: () => plansApi.getById(id),
    enabled: Boolean(id),
  });
}

export function useClientPlans(clientId, params = {}) {
  return useQuery({
    queryKey: [...PLANS_KEY, 'client', clientId, params],
    queryFn: () => plansApi.getClientPlans(clientId, params),
    enabled: Boolean(clientId),
  });
}

export function useMyActivePlan() {
  return useQuery({
    queryKey: [...PLANS_KEY, 'me', 'active'],
    queryFn: plansApi.getMyActivePlan,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: plansApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => plansApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: plansApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function useAssignPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, payload }) => plansApi.assignToClient(clientId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PLANS_KEY });
      queryClient.invalidateQueries({ queryKey: ['finances', 'client', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useCancelPlanAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, payload }) =>
      plansApi.cancelAssignment(assignmentId, payload || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANS_KEY });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}
