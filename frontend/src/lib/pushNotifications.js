import { notificationsApi } from '../services/notificationsService';
import {
  getServiceWorkerRegistration,
  isPushSupported,
  registerServiceWorker,
} from './pwa';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function getDeviceLabel() {
  return navigator.userAgent.slice(0, 150);
}

async function persistSubscription(subscription) {
  const json = subscription.toJSON();

  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Suscripción push incompleta');
  }

  await notificationsApi.subscribePush({
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    deviceLabel: getDeviceLabel(),
  });
}

export { isPushSupported };

export function getNotificationPermission() {
  if (!isPushSupported()) {
    return 'unsupported';
  }

  return Notification.permission;
}

export async function hasActivePushSubscription() {
  if (!isPushSupported()) {
    return false;
  }

  const registration = await getServiceWorkerRegistration();

  if (!registration) {
    return false;
  }

  const subscription = await registration.pushManager.getSubscription();
  return Boolean(subscription);
}

/**
 * Si el permiso ya está concedido, asegura suscripción local + registro en el backend.
 * No pide permiso (no es intrusivo). Ideal al abrir la PWA en iOS.
 */
export async function syncPushSubscriptionIfGranted() {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported' };
  }

  if (Notification.permission !== 'granted') {
    return { ok: false, reason: 'permission_not_granted' };
  }

  const { publicKey, enabled } = await notificationsApi.getVapidPublicKey();

  if (!enabled || !publicKey) {
    return { ok: false, reason: 'vapid_not_configured' };
  }

  let registration = await getServiceWorkerRegistration();

  if (!registration) {
    registration = await registerServiceWorker();
  }

  if (!registration) {
    return { ok: false, reason: 'no_service_worker' };
  }

  // Esperar a que el SW esté activo (crítico en iOS tras updates).
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await persistSubscription(subscription);

  return { ok: true, subscription };
}

export async function subscribeToPushNotifications() {
  if (!isPushSupported()) {
    throw new Error('Las notificaciones push no están soportadas en este navegador');
  }

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error('Permiso de notificaciones denegado');
  }

  const result = await syncPushSubscriptionIfGranted();

  if (!result.ok) {
    if (result.reason === 'vapid_not_configured') {
      throw new Error('Las notificaciones push no están configuradas en el servidor');
    }
    if (result.reason === 'no_service_worker') {
      throw new Error('No se pudo registrar el service worker');
    }
    throw new Error('No se pudo activar la suscripción push');
  }

  return result.subscription;
}

export async function unsubscribeFromPushNotifications() {
  if (!isPushSupported()) {
    return;
  }

  const registration = await getServiceWorkerRegistration();

  if (!registration) {
    return;
  }

  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  const endpoint = subscription.endpoint;

  await subscription.unsubscribe();
  await notificationsApi.unsubscribePush({ endpoint });
}
