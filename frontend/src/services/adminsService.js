import { api } from '../lib/api';

export const adminsApi = {
  list: async (params) => {
    const { data } = await api.get('/admins', { params });
    return data.data;
  },

  getById: async (id) => {
    const { data } = await api.get(`/admins/${id}`);
    return data.data;
  },

  create: async (payload) => {
    const { data } = await api.post('/admins', payload);
    return data.data;
  },

  update: async (id, payload) => {
    const { data } = await api.patch(`/admins/${id}`, payload);
    return data.data;
  },

  deactivate: async (id) => {
    const { data } = await api.delete(`/admins/${id}`);
    return data.data;
  },
};
