import { useEffect, useState } from 'react';
import {
  applyWaitingServiceWorker,
  canShowInstallBanner,
  canShowIosInstallGuide,
  dismissInstallBanner,
  dismissIosGuide,
  isAppInstalled,
  isIosDevice,
  promptInstallApp,
  subscribeInstallPrompt,
  subscribeOnlineStatus,
  subscribeUpdateAvailable,
} from '../lib/pwa';

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installed, setInstalled] = useState(isAppInstalled());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setInstalled(isAppInstalled());
    setShowIosGuide(canShowIosInstallGuide());

    return subscribeInstallPrompt(() => {
      setCanInstall(canShowInstallBanner());
      setInstalled(isAppInstalled());
      setShowIosGuide(canShowIosInstallGuide() && !canShowInstallBanner());
    });
  }, []);

  async function install() {
    setError('');
    setLoading(true);

    try {
      await promptInstallApp();
      setInstalled(true);
      setCanInstall(false);
      setShowIosGuide(false);
    } catch (installError) {
      if (installError.message !== 'Instalación cancelada') {
        setError(installError.message);
      }
      setCanInstall(canShowInstallBanner());
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
