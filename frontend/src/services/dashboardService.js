import { api } from '../lib/api';

export const dashboardApi = {
  getOverview: async (params) => {
    const { data } = await api.get('/dashboard/overview', { params });
    return data.data;
  },

  getToday: async () => {
    const { data } = await api.get('/dashboard/today');
    return data.data;
  },
};
