import { api } from '../lib/api';

export const plansApi = {
  list: async (params) => {
    const { data } = await api.get('/plans', { params });
    return data.data;
  },

  getById: async (id) => {
    const { data } = await api.get(`/plans/${id}`);
    return data.data.plan;
  },

  create: async (payload) => {
    const { data } = await api.post('/plans', payload);
    return data.data;
  },

  update: async (id, payload) => {
    const { data } = await api.patch(`/plans/${id}`, payload);
    return data.data;
  },

  delete: async (id) => {
    const { data } = await api.delete(`/plans/${id}`);
    return data.data;
  },

  getClientPlans: async (clientId, params) => {
    const { data } = await api.get(`/plans/client/${clientId}`, { params });
    return data.data;
  },

  assignToClient: async (clientId, payload) => {
    const { data } = await api.post(`/plans/client/${clientId}/assign`, payload);
    return data.data;
  },

  cancelAssignment: async (assignmentId, payload = {}) => {
    const { data } = await api.patch(`/plans/assignment/${assignmentId}/cancel`, payload);
    return data.data;
  },

  getMyActivePlan: async () => {
    const { data } = await api.get('/plans/me/active');
    return data.data.activePlan;
  },
};
