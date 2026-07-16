import { api } from '../lib/api';

export const scheduleChangesApi = {
  listMine: async (params) => {
    const { data } = await api.get('/schedule-changes/me', { params });
    return data.data;
  },

  createMine: async (payload) => {
    const { data } = await api.post('/schedule-changes/me', payload);
    return data.data.request;
  },

  cancelMine: async (id) => {
    const { data } = await api.patch(`/schedule-changes/me/${id}/cancel`);
    return data.data.request;
  },

  list: async (params) => {
    const { data } = await api.get('/schedule-changes', { params });
    return data.data;
  },

  getPendingCount: async () => {
    const { data } = await api.get('/schedule-changes/pending/count');
    return data.data.count;
  },

  approve: async (id, payload = {}) => {
    const { data } = await api.patch(`/schedule-changes/${id}/approve`, payload);
    return data.data;
  },

  reject: async (id, payload = {}) => {
    const { data } = await api.patch(`/schedule-changes/${id}/reject`, payload);
    return data.data.request;
  },

  reassign: async (payload) => {
    const { data } = await api.post('/schedule-changes/reassign', payload);
    return data.data;
  },
};
