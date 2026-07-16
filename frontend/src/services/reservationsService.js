import { api } from '../lib/api';

export const reservationsApi = {
  listMine: async (params) => {
    const { data } = await api.get('/reservations/me', { params });
    return data.data;
  },

  getRecoveryCredits: async () => {
    const { data } = await api.get('/reservations/me/recovery-credits');
    return data.data.credits;
  },

  listMyRecurring: async () => {
    const { data } = await api.get('/reservations/me/recurring');
    return data.data.recurring;
  },

  createMine: async (payload) => {
    const { data } = await api.post('/reservations/me', payload);
    return data.data.reservation;
  },

  cancelMine: async (id, payload = {}) => {
    const { data } = await api.patch(`/reservations/me/${id}/cancel`, payload);
    return data.data;
  },

  list: async (params) => {
    const { data } = await api.get('/reservations', { params });
    return data.data;
  },

  listByClass: async (classId) => {
    const { data } = await api.get(`/reservations/class/${classId}`);
    return data.data.reservations;
  },

  listByClient: async (clientId, params) => {
    const { data } = await api.get(`/reservations/client/${clientId}`, { params });
    return data.data;
  },

  create: async (payload) => {
    const { data } = await api.post('/reservations', payload);
    return data.data.reservation;
  },

  confirm: async (id, payload = {}) => {
    const { data } = await api.patch(`/reservations/${id}/confirm`, payload);
    return data.data;
  },

  cancel: async (id, payload = {}) => {
    const { data } = await api.patch(`/reservations/${id}/cancel`, payload);
    return data.data;
  },

  listRecurringByClient: async (clientId) => {
    const { data } = await api.get(`/reservations/recurring/client/${clientId}`);
    return data.data.recurring;
  },

  createRecurring: async (payload) => {
    const { data } = await api.post('/reservations/recurring', payload);
    return data.data;
  },

  updateRecurring: async (id, payload) => {
    const { data } = await api.patch(`/reservations/recurring/${id}`, payload);
    return data.data;
  },

  processRecurring: async () => {
    const { data } = await api.post('/reservations/recurring/process');
    return data.data.processing;
  },
};
