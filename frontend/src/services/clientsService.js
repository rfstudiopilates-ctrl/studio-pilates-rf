import { api } from '../lib/api';

export const clientsApi = {
  list: async (params) => {
    const { data } = await api.get('/clients', { params });
    return data.data;
  },

  getById: async (id, params = {}) => {
    const { data } = await api.get(`/clients/${id}`, { params });
    return data.data;
  },

  create: async (payload) => {
    const { data } = await api.post('/clients', payload);
    return data.data;
  },

  update: async (id, payload) => {
    const { data } = await api.patch(`/clients/${id}`, payload);
    return data.data;
  },

  delete: async (id) => {
    const { data } = await api.delete(`/clients/${id}`);
    return data.data;
  },
};
