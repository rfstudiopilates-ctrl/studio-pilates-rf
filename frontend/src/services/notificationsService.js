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

  getInbox: async (params = {}) => {
    const { data } = await api.get('/notifications/inbox', { params });
    return data.data;
  },

  getUnreadCount: async () => {
    const { data } = await api.get('/notifications/inbox/unread-count');
    return data.data;
  },

  markAsRead: async (id) => {
    const { data } = await api.post(`/notifications/inbox/${id}/read`);
    return data.data;
  },

  markAllAsRead: async () => {
    const { data } = await api.post('/notifications/inbox/read-all');
    return data.data;
  },

  clearInbox: async () => {
    const { data } = await api.post('/notifications/inbox/clear');
    return data.data;
  },

  getPushStatus: async () => {
    const { data } = await api.get('/notifications/push/status');
    return data.data;
  },

  sendTestPush: async () => {
    const { data } = await api.post('/notifications/push/test');
    return data.data;
  },
};
