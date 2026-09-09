import api from './api';

export const scheduleChangesApi = {
  list: async (params) => {
    const { data } = await api.get('/schedule-changes', { params });
    return data.data;
  },

  getPendingCount: async () => {
    const { data } = await api.get('/schedule-changes/pending/count');
    return data.data;
  },

  approve: async (id, payload) => {
    const { data } = await api.patch(`/schedule-changes/${id}/approve`, payload);
    return data.data;
  },

  reject: async (id, payload) => {
    const { data } = await api.patch(`/schedule-changes/${id}/reject`, payload);
    return data.data;
  },

  reassign: async (payload) => {
    const { data } = await api.post('/schedule-changes/reassign', payload);
    return data.data;
  },
};
