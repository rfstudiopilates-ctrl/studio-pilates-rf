import { api } from '../lib/api';

export const settingsApi = {
  getPublic: async () => {
    const { data } = await api.get('/settings/public');
    return data.data.settings;
  },

  getAdmin: async () => {
    const { data } = await api.get('/settings');
    return data.data.settings;
  },

  update: async (payload) => {
    const { data } = await api.patch('/settings', payload);
    return data.data;
  },
};
