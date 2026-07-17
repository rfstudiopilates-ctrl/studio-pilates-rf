import { api } from '../lib/api';

export const authApi = {
  login: async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    return data.data;
  },

  adminLogin: async (credentials) => {
    const { data } = await api.post('/auth/admin/login', credentials);
    return data.data;
  },

  clientLogin: async (credentials) => {
    const { data } = await api.post('/auth/client/login', credentials);
    return data.data;
  },

  refresh: async () => {
    const { data } = await api.post('/auth/refresh');
    return data.data;
  },

  logout: async () => {
    const { data } = await api.post('/auth/logout');
    return data.data;
  },

  me: async () => {
    const { data } = await api.get('/auth/me');
    return data.data.user;
  },

  markPwaInstalled: async () => {
    const { data } = await api.post('/auth/pwa-installed');
    return data.data;
  },
};
