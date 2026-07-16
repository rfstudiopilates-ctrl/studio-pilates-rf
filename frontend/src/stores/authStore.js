import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isHydrated: false,

      setSession: ({ accessToken, user }) =>
        set({
          accessToken,
          user,
          isAuthenticated: Boolean(accessToken && user),
        }),

      clearSession: () =>
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
        }),

      setHydrated: () => set({ isHydrated: true }),

      getRole: () => get().user?.role ?? null,
    }),
    {
      name: 'studio-pilates-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
