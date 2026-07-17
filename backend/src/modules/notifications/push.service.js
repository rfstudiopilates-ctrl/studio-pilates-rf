import webpush from 'web-push';
import { env } from '../../config/env.js';
import * as notificationsRepository from './notifications.repository.js';

let isConfigured = false;

function ensureWebPushConfigured() {
  if (isConfigured) {
    return true;
  }

  if (!env.vapid.publicKey || !env.vapid.privateKey) {
    return false;
  }

  webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey);
  isConfigured = true;
  return true;
}

export function getVapidPublicKey() {
  return env.vapid.publicKey || null;
}

export function isPushEnabled() {
  return Boolean(env.vapid.publicKey && env.vapid.privateKey);
}

export async function sendPushNotification(subscription, payload) {
  if (!ensureWebPushConfigured()) {
    return { ok: false, reason: 'push_not_configured' };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dhKey,
          auth: subscription.authKey,
        },
      },
      JSON.stringify(payload),
      {
        TTL: 60 * 60 * 24,
        urgency: 'high',
      }
    );

    return { ok: true };
  } catch (error) {
    const statusCode = error.statusCode || error.status || null;

    if (statusCode === 404 || statusCode === 410) {
      await notificationsRepository.markPushSubscriptionInactive(subscription.id);
    }

    const reason = statusCode
      ? `HTTP ${statusCode}: ${error.message || 'push_failed'}`
      : error.message || 'push_failed';

    console.error(
      `[PUSH] Falló envío a sub#${subscription.id} (${subscription.userType}#${subscription.userId}): ${reason}`
    );

    return { ok: false, reason, statusCode };
  }
}

export async function sendPushToUser(userType, userId, payload) {
  const subscriptions = await notificationsRepository.listActivePushSubscriptions(
    userType,
    Number(userId)
  );

  if (subscriptions.length === 0) {
    console.warn(
      `[PUSH] Sin suscripciones activas para ${userType}#${userId} (${payload?.eventType || 'event'})`
    );
    return { sent: 0, failed: 0, errors: ['no_subscriptions'] };
  }

  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const subscription of subscriptions) {
    const result = await sendPushNotification(subscription, payload);
    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      if (result.reason) {
        errors.push(result.reason);
      }
    }
  }

  return { sent, failed, errors };
}
