import { api } from '../lib/api';

export const notificationsApi = {
  getVapidPublicKey: async () => {
    const { data } = await api.get('/notifications/vapid-public-key');
    return data.data;
  },

  subscribePush: async (payload) => {
    const { data } = await api.post('/notifications/push/subscribe', payload);
    return data.data;
  },

  unsubscribePush: async (payload) => {
    const { data } = await api.post('/notifications/push/unsubscribe', payload);
    return data.data;
  },
};
