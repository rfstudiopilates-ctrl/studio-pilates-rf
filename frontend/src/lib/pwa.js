const SW_PATH = '/sw.js';
const INSTALL_DISMISSED_KEY = 'sprf-pwa-install-dismissed';
const IOS_GUIDE_DISMISSED_KEY = 'sprf-pwa-ios-guide-dismissed';
const APP_INSTALLED_KEY = 'sprf-pwa-installed';
const APP_INSTALLED_COOKIE = 'sprf_pwa_installed';

let deferredInstallPrompt = null;
let waitingWorker = null;
let pendingUpdateReload = false;
let relatedAppsChecked = false;
let relatedAppsInstalled = false;

const installPromptListeners = new Set();
const onlineStatusListeners = new Set();
const updateListeners = new Set();

function notifyInstallPromptListeners() {
  installPromptListeners.forEach((listener) => listener(deferredInstallPrompt));
}

function notifyOnlineStatusListeners() {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  onlineStatusListeners.forEach((listener) => listener(isOnline));
}

function notifyUpdateListeners() {
  const available = Boolean(waitingWorker);
  updateListeners.forEach((listener) => listener(available));
}

function setWaitingWorker(worker) {
  waitingWorker = worker || null;
  notifyUpdateListeners();
}

function readCookie(name) {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name, value, maxAgeSeconds) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function isServiceWorkerSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

export function isPushSupported() {
  return (
    isServiceWorkerSupported() &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true
  );
}

export function markAppInstalledLocally() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(APP_INSTALLED_KEY, '1');
    localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    localStorage.setItem(IOS_GUIDE_DISMISSED_KEY, '1');
  } catch {
    // storage bloqueado / privado
  }

  writeCookie(APP_INSTALLED_COOKIE, '1', 60 * 60 * 24 * 400);
  deferredInstallPrompt = null;
  notifyInstallPromptListeners();
}

export function hasLocalInstallPreference() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    if (localStorage.getItem(APP_INSTALLED_KEY) === '1') {
      return true;
    }
  } catch {
    // ignore
  }

  return readCookie(APP_INSTALLED_COOKIE) === '1';
}

export function isAppInstalled() {
  if (typeof window === 'undefined') {
    return false;
  }

  return isStandaloneDisplay() || hasLocalInstallPreference() || relatedAppsInstalled;
}

export function isIosDevice() {
  if (typeof window === 'undefined') {
    return false;
  }

  const ua = window.navigator.userAgent || '';
  const isAppleMobile = /iPad|iPhone|iPod/.test(ua);
  const isIpadOs =
    window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;

  return isAppleMobile || isIpadOs;
}

export function wasInstallBannerDismissed() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return localStorage.getItem(INSTALL_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function wasIosGuideDismissed() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return localStorage.getItem(IOS_GUIDE_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissInstallBanner() {
  try {
    localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
  } catch {
    // ignore
  }
  deferredInstallPrompt = null;
  notifyInstallPromptListeners();
}

export function dismissIosGuide() {
  try {
    localStorage.setItem(IOS_GUIDE_DISMISSED_KEY, '1');
  } catch {
    // ignore
  }
  notifyInstallPromptListeners();
}

export function canShowInstallBanner() {
  return Boolean(deferredInstallPrompt) && !isAppInstalled() && !wasInstallBannerDismissed();
}

export function canShowIosInstallGuide() {
  return isIosDevice() && !isAppInstalled() && !wasIosGuideDismissed();
}

export function subscribeInstallPrompt(listener) {
  installPromptListeners.add(listener);
  listener(deferredInstallPrompt);
  return () => installPromptListeners.delete(listener);
}

export function subscribeOnlineStatus(listener) {
  onlineStatusListeners.add(listener);
  listener(typeof navigator !== 'undefined' ? navigator.onLine : true);
  return () => onlineStatusListeners.delete(listener);
}

export function subscribeUpdateAvailable(listener) {
  updateListeners.add(listener);
  listener(Boolean(waitingWorker));
  return () => updateListeners.delete(listener);
}

async function detectRelatedInstalledApps() {
  if (relatedAppsChecked || typeof navigator === 'undefined') {
    return;
  }

  relatedAppsChecked = true;

  if (!navigator.getInstalledRelatedApps) {
    return;
  }

  try {
    const apps = await navigator.getInstalledRelatedApps();
    if (Array.isArray(apps) && apps.length > 0) {
      relatedAppsInstalled = true;
      markAppInstalledLocally();
    }
  } catch {
    // No disponible / sin permiso
  }
}

export function initPwaListeners() {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (isStandaloneDisplay()) {
    markAppInstalledLocally();
  }

  detectRelatedInstalledApps().finally(() => {
    notifyInstallPromptListeners();
  });

  const handleBeforeInstallPrompt = (event) => {
    event.preventDefault();

    if (isAppInstalled()) {
      deferredInstallPrompt = null;
      notifyInstallPromptListeners();
      return;
    }

    deferredInstallPrompt = event;
    notifyInstallPromptListeners();
  };

  const handleAppInstalled = () => {
    markAppInstalledLocally();
  };

  const handleOnline = () => notifyOnlineStatusListeners();
  const handleOffline = () => notifyOnlineStatusListeners();

  const handleControllerChange = () => {
    if (!pendingUpdateReload) {
      return;
    }
    pendingUpdateReload = false;
    window.location.reload();
  };

  const handleDisplayModeChange = () => {
    if (isStandaloneDisplay()) {
      markAppInstalledLocally();
    }
  };

  const standaloneQuery = window.matchMedia('(display-mode: standalone)');
  if (standaloneQuery.addEventListener) {
    standaloneQuery.addEventListener('change', handleDisplayModeChange);
  } else if (standaloneQuery.addListener) {
    standaloneQuery.addListener(handleDisplayModeChange);
  }

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  if (isServiceWorkerSupported()) {
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
  }

  return () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (standaloneQuery.removeEventListener) {
      standaloneQuery.removeEventListener('change', handleDisplayModeChange);
    } else if (standaloneQuery.removeListener) {
      standaloneQuery.removeListener(handleDisplayModeChange);
    }
    if (isServiceWorkerSupported()) {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    }
  };
}

function trackInstallingWorker(worker) {
  if (!worker) {
    return;
  }

  worker.addEventListener('statechange', () => {
    if (worker.state !== 'installed') {
      return;
    }

    if (!navigator.serviceWorker.controller) {
      worker.postMessage({ type: 'SKIP_WAITING' });
      return;
    }

    setWaitingWorker(worker);
  });
}

export async function registerServiceWorker() {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  const registration = await navigator.serviceWorker.register(SW_PATH, {
    scope: '/',
    updateViaCache: 'none',
  });

  if (registration.waiting) {
    if (navigator.serviceWorker.controller) {
      setWaitingWorker(registration.waiting);
    } else {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  if (registration.installing) {
    trackInstallingWorker(registration.installing);
  }

  registration.addEventListener('updatefound', () => {
    trackInstallingWorker(registration.installing);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      registration.update().catch(() => {});
    }
  });

  await navigator.serviceWorker.ready;
  return registration;
}

export async function applyWaitingServiceWorker() {
  if (!waitingWorker) {
    const registration = await getServiceWorkerRegistration();
    if (registration?.waiting) {
      setWaitingWorker(registration.waiting);
    }
  }

  if (!waitingWorker) {
    throw new Error('No hay una actualización pendiente');
  }

  pendingUpdateReload = true;
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

export async function getServiceWorkerRegistration() {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  return navigator.serviceWorker.getRegistration('/');
}

export async function promptInstallApp() {
  if (!deferredInstallPrompt) {
    throw new Error('La instalación no está disponible en este dispositivo');
  }

  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;

  if (choice.outcome !== 'accepted') {
    dismissInstallBanner();
    throw new Error('Instalación cancelada');
  }

  markAppInstalledLocally();
  return choice;
}

export async function setupPwa() {
  if (!import.meta.env.PROD) {
    return null;
  }

  return registerServiceWorker();
}
