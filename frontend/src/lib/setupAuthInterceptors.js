import { api } from './api';
import { ApiError } from './formErrors';
import { useAuthStore } from '../stores/authStore';

let isRefreshing = false;
let refreshQueue = [];

function processQueue(error, token = null) {
  refreshQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });

  refreshQueue = [];
}

function toApiError(error) {
  if (error instanceof ApiError) {
    return error;
  }

  if (error?.code === 'ECONNABORTED') {
    return new ApiError('La solicitud tardó demasiado. Intentá de nuevo.');
  }

  const apiError = error?.response?.data?.error;
  if (apiError?.message) {
    return new ApiError(apiError.message, apiError.fields || null);
  }

  if (!error?.response || error.message === 'Network Error') {
    return new ApiError(
      'No hay conexión con el servidor. Revisá tu internet e intentá de nuevo.'
    );
  }

  if (
    typeof error?.message === 'string' &&
    error.message.trim() &&
    !error.message.startsWith('Request failed with status')
  ) {
    return new ApiError(error.message);
  }

  return new ApiError('Ocurrió un error inesperado');
}

export function setupAuthInterceptors() {
  api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (!originalRequest || originalRequest._retry) {
        return Promise.reject(toApiError(error));
      }

      const isAuthEndpoint =
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/admin/login') ||
        originalRequest.url?.includes('/auth/client/login') ||
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/settings/public');

      if (error.response?.status !== 401 || isAuthEndpoint) {
        return Promise.reject(toApiError(error));
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        const { accessToken, user } = data.data;

        useAuthStore.getState().setSession({ accessToken, user });
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().clearSession();
        return Promise.reject(toApiError(refreshError));
      } finally {
        isRefreshing = false;
      }
    }
  );
}
