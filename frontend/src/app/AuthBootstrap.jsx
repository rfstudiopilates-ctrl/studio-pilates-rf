import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export default function AuthBootstrap({ children }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const setHydrated = useAuthStore((state) => state.setHydrated);

  useEffect(() => {
    const finishHydration = () => setHydrated();

    if (useAuthStore.persist.hasHydrated()) {
      finishHydration();
      return undefined;
    }

    const unsubscribe = useAuthStore.persist.onFinishHydration(finishHydration);
    return unsubscribe;
  }, [setHydrated]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted">
        <div className="glass-card px-6 py-4 text-sm text-text-muted">Iniciando aplicación...</div>
      </div>
    );
  }

  return children;
}
