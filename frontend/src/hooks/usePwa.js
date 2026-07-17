import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { authApi } from '../services/authService';
import {
  applyWaitingServiceWorker,
  canShowInstallBanner,
  canShowIosInstallGuide,
  dismissInstallBanner,
  dismissIosGuide,
  isAppInstalled,
  isIosDevice,
  isStandaloneDisplay,
  markAppInstalledLocally,
  promptInstallApp,
  subscribeInstallPrompt,
  subscribeOnlineStatus,
  subscribeUpdateAvailable,
} from '../lib/pwa';

export function usePwaInstall() {
  const { user, setSession, accessToken } = useAuth();
  const [canInstall, setCanInstall] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installed, setInstalled] = useState(
    () => isAppInstalled() || Boolean(user?.pwaInstalled)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshVisibility = () => {
    const nextInstalled = isAppInstalled() || Boolean(user?.pwaInstalled);
    setInstalled(nextInstalled);
    setCanInstall(!nextInstalled && canShowInstallBanner());
    setShowIosGuide(!nextInstalled && canShowIosInstallGuide() && !canShowInstallBanner());
  };

  useEffect(() => {
    refreshVisibility();
    return subscribeInstallPrompt(() => {
      refreshVisibility();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.pwaInstalled]);

  useEffect(() => {
    if (!user?.pwaInstalled) {
      return;
    }

    markAppInstalledLocally();
    refreshVisibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.pwaInstalled]);

  useEffect(() => {
    if (!accessToken || !isStandaloneDisplay() || user?.pwaInstalled) {
      return undefined;
    }

    let cancelled = false;

    authApi
      .markPwaInstalled()
      .then((result) => {
        if (cancelled || !result?.user) {
          return;
        }

        markAppInstalledLocally();
        setSession({ accessToken, user: result.user });
      })
      .catch(() => {
        markAppInstalledLocally();
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, setSession, user?.pwaInstalled]);

  async function install() {
    setError('');
    setLoading(true);

    try {
      await promptInstallApp();
      setInstalled(true);
      setCanInstall(false);
      setShowIosGuide(false);

      if (accessToken) {
        try {
          const result = await authApi.markPwaInstalled();
          if (result?.user) {
            setSession({ accessToken, user: result.user });
          }
        } catch {
          // local flag ya quedó marcado
        }
      }
    } catch (installError) {
      if (installError.message !== 'Instalación cancelada') {
        setError(installError.message);
      }
      refreshVisibility();
    } finally {
      setLoading(false);
    }
  }

  function dismiss() {
    if (canInstall) {
      dismissInstallBanner();
      setCanInstall(false);
      return;
    }

    dismissIosGuide();
    setShowIosGuide(false);
  }

  return {
    canInstall,
    showIosGuide,
    isIos: isIosDevice(),
    installed,
    loading,
    error,
    install,
    dismiss,
  };
}

export function usePwaUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => subscribeUpdateAvailable(setUpdateAvailable), []);

  async function applyUpdate() {
    setError('');
    setApplying(true);

    try {
      await applyWaitingServiceWorker();
    } catch (updateError) {
      setError(updateError.message);
      setApplying(false);
    }
  }

  return {
    updateAvailable,
    applying,
    error,
    applyUpdate,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => subscribeOnlineStatus(setIsOnline), []);

  return isOnline;
}
