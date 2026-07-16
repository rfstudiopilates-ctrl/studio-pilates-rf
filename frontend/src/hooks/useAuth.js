import { useAuthStore } from '../stores/authStore';
import { authApi } from '../services/authService';

export function useAuth() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  const login = async (credentials) => {
    const session = await authApi.login(credentials);
    setSession(session);
    return session;
  };

  const loginAdmin = async (credentials) => {
    const session = await authApi.adminLogin(credentials);
    setSession(session);
    return session;
  };

  const loginClient = async (credentials) => {
    const session = await authApi.clientLogin(credentials);
    setSession(session);
    return session;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  };

  const refreshProfile = async () => {
    const profile = await authApi.me();
    setSession({ accessToken, user: profile });
    return profile;
  };

  return {
    accessToken,
    user,
    isAuthenticated,
    isHydrated,
    login,
    loginAdmin,
    loginClient,
    logout,
    refreshProfile,
    clearSession,
    setSession,
  };
}
