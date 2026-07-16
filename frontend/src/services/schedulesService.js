import { api } from '../lib/api';

export const schedulesApi = {
  getWeekly: async () => {
    const { data } = await api.get('/schedules');
    return data.data;
  },

  replaceBulk: async (slots) => {
    const { data } = await api.put('/schedules/bulk', { slots });
    return data.data;
  },
};
