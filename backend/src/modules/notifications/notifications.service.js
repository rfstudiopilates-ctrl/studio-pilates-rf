import * as notificationsRepository from './notifications.repository.js';
import * as pushService from './push.service.js';
import { notifyTestPush } from './notifications.dispatcher.js';
import { createAppError } from '../../utils/AppError.js';

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

export async function getInbox(userType, userId, query = {}) {
  return notificationsRepository.listInboxNotifications({
    recipientType: userType,
    recipientId: Number(userId),
    page: query.page || 1,
    limit: query.limit || 30,
  });
}

export async function getUnreadCount(userType, userId) {
  const unreadCount = await notificationsRepository.countUnreadInbox({
    recipientType: userType,
    recipientId: Number(userId),
  });

  return { unreadCount };
}

export async function markAsRead(userType, userId, notificationId) {
  const notification = await notificationsRepository.markInboxNotificationRead({
    id: Number(notificationId),
    recipientType: userType,
    recipientId: Number(userId),
  });

  if (
    !notification ||
    notification.channel !== 'in_app' ||
    notification.recipientType !== userType ||
    Number(notification.recipientId) !== Number(userId)
  ) {
    throw createAppError('Notificación no encontrada', 404);
  }

  return notification;
}

export async function markAllAsRead(userType, userId) {
  return notificationsRepository.markAllInboxNotificationsRead({
    recipientType: userType,
    recipientId: Number(userId),
  });
}

export async function sendTestPush(userType, userId) {
  try {
    return await notifyTestPush({
      recipientType: userType,
      recipientId: userId,
    });
  } catch (error) {
    throw createAppError(error.message || 'No se pudo enviar la prueba', 400);
  }
}

export async function getPushStatus(userType, userId) {
  const subscriptions = await notificationsRepository.listActivePushSubscriptions(
    userType,
    Number(userId)
  );

  return {
    enabled: pushService.isPushEnabled(),
    deviceCount: subscriptions.length,
    devices: subscriptions.map((item) => ({
      id: item.id,
      deviceLabel: item.deviceLabel,
      updatedAt: item.updatedAt,
    })),
  };
}
