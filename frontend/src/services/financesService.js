import { api } from '../lib/api';

export const financesApi = {
  getClientFinances: async (clientId, params) => {
    const { data } = await api.get(`/finances/client/${clientId}`, { params });
    return data.data;
  },

  createMovement: async (clientId, payload) => {
    const { data } = await api.post(`/finances/client/${clientId}/movements`, payload);
    return data.data;
  },

  settlePlanAssignment: async (clientId, payload) => {
    const { data } = await api.post(`/finances/client/${clientId}/plan-settlement`, payload);
    return data.data;
  },

  getOverview: async (params) => {
    const { data } = await api.get('/finances/overview', { params });
    return data.data;
  },

  listMovements: async (params) => {
    const { data } = await api.get('/finances/movements', { params });
    return data.data;
  },

  getMyAccount: async () => {
    const { data } = await api.get('/finances/me/account');
    return data.data;
  },
};
