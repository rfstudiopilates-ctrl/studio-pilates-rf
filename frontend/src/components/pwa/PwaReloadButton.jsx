import { useEffect, useState } from 'react';
import NavIcon from '../ui/NavIcon';
import { isStandaloneDisplay } from '../../lib/pwa';

export default function PwaReloadButton() {
  const [visible, setVisible] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    setVisible(isStandaloneDisplay());
  }, []);

  if (!visible) {
    return null;
  }

  async function handleReload() {
    if (reloading) {
      return;
    }

    setReloading(true);

    try {
      const registration = await navigator.serviceWorker?.getRegistration?.('/');
      await registration?.update?.();
    } catch {
      // Si no se puede actualizar el service worker, recargar igual.
    } finally {
      window.setTimeout(() => {
        window.location.reload();
      }, 120);
    }
  }

  return (
    <button
      type="button"
      onClick={handleReload}
      disabled={reloading}
      className="fixed right-4 z-70 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white/95 text-text shadow-[0_10px_30px_rgba(26,26,26,0.16)] backdrop-blur transition active:scale-95 disabled:opacity-70 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] lg:bottom-4"
      aria-label="Recargar app"
      title="Recargar app"
    >
      <NavIcon
        name="refresh"
        className={`h-5 w-5 ${reloading ? 'animate-spin' : ''}`}
      />
    </button>
  );
}
