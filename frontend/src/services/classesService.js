import { api } from '../lib/api';

export const classesApi = {
  list: async (params) => {
    const { data } = await api.get('/classes', { params });
    return data.data;
  },

  getCalendar: async (params) => {
    const { data } = await api.get('/classes/calendar', { params });
    return data.data;
  },

  getAvailability: async (params) => {
    const { data } = await api.get('/classes/availability', { params });
    return data.data;
  },

  getById: async (id) => {
    const { data } = await api.get(`/classes/${id}`);
    return data.data.class;
  },

  generate: async () => {
    const { data } = await api.post('/classes/generate');
    return data.data;
  },

  update: async (id, payload) => {
    const { data } = await api.patch(`/classes/${id}`, payload);
    return data.data.class;
  },

  listScheduleCleanupCandidates: async () => {
    const { data } = await api.get('/classes/schedule-cleanup-candidates');
    return data.data;
  },

  previewCancelFutureBySchedule: async (params) => {
    const { data } = await api.get('/classes/cancel-future-by-schedule/preview', { params });
    return data.data;
  },

  cancelFutureBySchedule: async (payload) => {
    const { data } = await api.post('/classes/cancel-future-by-schedule', payload);
    return data.data;
  },
};
