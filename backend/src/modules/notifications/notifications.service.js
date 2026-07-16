import * as notificationsRepository from './notifications.repository.js';
import * as pushService from './push.service.js';

export function getVapidPublicKey() {
  return {
    publicKey: pushService.getVapidPublicKey(),
    enabled: pushService.isPushEnabled(),
  };
}

export async function subscribePush(userType, userId, payload) {
  return notificationsRepository.upsertPushSubscription({
    userType,
    userId: Number(userId),
    endpoint: payload.endpoint,
    p256dhKey: payload.keys.p256dh,
    authKey: payload.keys.auth,
    deviceLabel: payload.deviceLabel,
  });
}

export async function unsubscribePush(userType, userId, endpoint) {
  await notificationsRepository.deactivatePushSubscription(
    endpoint,
    userType,
    Number(userId)
  );
  return { message: 'Suscripción push desactivada' };
}
