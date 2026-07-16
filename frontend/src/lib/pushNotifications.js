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

export async function subscribeToPushNotifications() {
  if (!isPushSupported()) {
    throw new Error('Las notificaciones push no están soportadas en este navegador');
  }

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error('Permiso de notificaciones denegado');
  }

  const { publicKey, enabled } = await notificationsApi.getVapidPublicKey();

  if (!enabled || !publicKey) {
    throw new Error('Las notificaciones push no están configuradas en el servidor');
  }

  let registration = await getServiceWorkerRegistration();

  if (!registration) {
    registration = await registerServiceWorker();
  }

  if (!registration) {
    throw new Error('No se pudo registrar el service worker');
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();

  await notificationsApi.subscribePush({
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    deviceLabel: navigator.userAgent.slice(0, 150),
  });

  return subscription;
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
