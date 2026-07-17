import { env } from '../../config/env.js';
import { getSettings } from '../settings/settings.repository.js';
import * as notificationsRepository from './notifications.repository.js';
import * as pushService from './push.service.js';
import {
  ADMIN_EVENT_MAP,
  CLIENT_EVENT_MAP,
  NOTIFICATION_EVENTS,
} from './notifications.constants.js';

function isNotificationEnabled(settings, recipientType, eventType) {
  const settingsKey =
    recipientType === 'admin'
      ? ADMIN_EVENT_MAP[eventType]
      : CLIENT_EVENT_MAP[eventType];

  if (!settingsKey) {
    return false;
  }

  return Boolean(settings.notificationSettings?.[recipientType]?.[settingsKey]);
}

function formatClassDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date);
}

function formatWhen(reservation) {
  if (!reservation?.classDate || !reservation?.startTime) {
    return '';
  }

  return ` del ${formatClassDate(reservation.classDate)} a las ${reservation.startTime}`;
}

async function dispatchToRecipient({
  recipientType,
  recipientId,
  eventType,
  title,
  body,
  payload,
}) {
  const settings = await getSettings();

  if (!isNotificationEnabled(settings, recipientType, eventType)) {
    await notificationsRepository.createNotificationLog({
      channel: 'push',
      recipientType,
      recipientId,
      eventType,
      title,
      body,
      payload,
      status: 'skipped',
    });
    return;
  }

  // Siempre queda en la campanita de la app (aunque el push falle o no haya dispositivo).
  await notificationsRepository.createNotificationLog({
    channel: 'in_app',
    recipientType,
    recipientId,
    eventType,
    title,
    body,
    payload,
    status: 'sent',
    sentAt: new Date(),
  });

  if (!pushService.isPushEnabled()) {
    console.warn('[NOTIFY] Push no configurado (faltan claves VAPID).');
    await notificationsRepository.createNotificationLog({
      channel: 'push',
      recipientType,
      recipientId,
      eventType,
      title,
      body,
      payload,
      status: 'failed',
    });
    return;
  }

  const pushResult = await pushService.sendPushToUser(recipientType, recipientId, {
    title,
    body,
    url: payload?.url || env.appUrl,
    eventType,
  });

  await notificationsRepository.createNotificationLog({
    channel: 'push',
    recipientType,
    recipientId,
    eventType,
    title,
    body: pushResult.sent > 0
      ? body
      : `${body}${pushResult.errors?.length ? ` [${pushResult.errors.join('; ')}]` : ' [sin dispositivos]'}`,
    payload,
    status: pushResult.sent > 0 ? 'sent' : 'failed',
    sentAt: pushResult.sent > 0 ? new Date() : null,
  });

  if (pushResult.sent === 0) {
    console.warn(
      `[NOTIFY] Push falló para ${recipientType}#${recipientId} (${eventType}):`,
      pushResult.errors?.join('; ') || 'sin dispositivos'
    );
  }
}

async function dispatchToAdmins(eventType, { title, body, payload }) {
  const adminIds = await notificationsRepository.listAdminUserIds();

  await Promise.all(
    adminIds.map((adminId) =>
      dispatchToRecipient({
        recipientType: 'admin',
        recipientId: adminId,
        eventType,
        title,
        body,
        payload,
      })
    )
  );
}

async function dispatchToClient(clientId, options) {
  const client = await notificationsRepository.getClientById(clientId);

  if (!client) {
    return;
  }

  await dispatchToRecipient({
    recipientType: 'client',
    recipientId: clientId,
    ...options,
  });
}

export async function notifyNewReservation({ reservation, clientName }) {
  const when = formatWhen(reservation).replace(/^ del /, ' el ');

  await dispatchToAdmins(NOTIFICATION_EVENTS.NEW_RESERVATION, {
    title: 'Nueva reserva',
    body: `${clientName} reservó clase${when}`,
    payload: { url: `${env.appUrl}/admin/clases` },
  });
}

export async function notifyPendingReservation({ reservation, clientName }) {
  const when = formatWhen(reservation).replace(/^ del /, ' el ');

  await dispatchToAdmins(NOTIFICATION_EVENTS.PENDING_REQUEST, {
    title: 'Solicitud de clase puntual',
    body: `${clientName} pidió un turno${when}. Revisá la seña y confirmá.`,
    payload: { url: `${env.appUrl}/admin/clases?tab=solicitudes` },
  });
}

export async function notifyReservationApproved({
  reservation,
  clientId,
  wasDropIn = false,
}) {
  const when = formatWhen(reservation);

  await dispatchToClient(clientId, {
    eventType: NOTIFICATION_EVENTS.RESERVATION_APPROVED,
    title: wasDropIn ? 'Solicitud confirmada' : 'Reserva confirmada',
    body: wasDropIn
      ? `Tu solicitud de turno${when} fue confirmada. ¡Te esperamos!`
      : `Tu clase${when} fue confirmada`,
    payload: { url: `${env.appUrl}/cliente/reservas` },
  });
}

/**
 * Textos según el caso:
 * - Solicitud pendiente cancelada por el cliente → avisa al admin (no al cliente).
 * - Solicitud pendiente cancelada por el admin → avisa al cliente.
 * - Clase confirmada cancelada por el cliente → avisa al admin (no al cliente).
 * - Clase confirmada cancelada por el admin → avisa al cliente ("Tu clase… fue cancelada").
 */
export async function notifyReservationCancelled({
  reservation,
  clientId,
  clientName,
  cancelledBy,
  wasPendingRequest = false,
}) {
  const when = formatWhen(reservation);

  if (wasPendingRequest) {
    if (cancelledBy === 'client') {
      await dispatchToAdmins(NOTIFICATION_EVENTS.CANCELLATION, {
        title: 'Solicitud cancelada',
        body: `${clientName} canceló la solicitud por la clase${when}`,
        payload: { url: `${env.appUrl}/admin/clases?tab=solicitudes` },
      });
    } else if (cancelledBy === 'admin') {
      await dispatchToClient(clientId, {
        eventType: NOTIFICATION_EVENTS.CANCELLATION,
        title: 'Solicitud cancelada',
        body: `La solicitud por la clase${when} fue cancelada`,
        payload: { url: `${env.appUrl}/cliente/reservas` },
      });
    }
    return;
  }

  if (cancelledBy === 'client') {
    await dispatchToAdmins(NOTIFICATION_EVENTS.CANCELLATION, {
      title: 'Cliente canceló una clase',
      body: `${clientName} canceló la clase${when}`,
      payload: { url: `${env.appUrl}/admin/clases` },
    });
    return;
  }

  if (cancelledBy === 'admin') {
    await dispatchToClient(clientId, {
      eventType: NOTIFICATION_EVENTS.CANCELLATION,
      title: 'Clase cancelada',
      body: `Tu clase${when} fue cancelada`,
      payload: { url: `${env.appUrl}/cliente/reservas` },
    });
  }
}

export async function notifyScheduleChangeRequested({ request: _request, clientName }) {
  await dispatchToAdmins(NOTIFICATION_EVENTS.SCHEDULE_CHANGE, {
    title: 'Solicitud de cambio de horario',
    body: `${clientName} solicitó cambiar su clase`,
    payload: { url: `${env.appUrl}/admin/clases?tab=cambios` },
  });
}

export async function notifyScheduleChangeApproved({ request, clientId }) {
  await dispatchToClient(clientId, {
    eventType: NOTIFICATION_EVENTS.SCHEDULE_CHANGE_APPROVED,
    title: 'Cambio de horario aprobado',
    body: `Tu nueva clase es el ${formatClassDate(request.toClass.classDate)} a las ${request.toClass.startTime}`,
    payload: { url: `${env.appUrl}/cliente/reservas` },
  });
}

export async function notifyPlanCancelled({ clientId, planName }) {
  await dispatchToClient(clientId, {
    eventType: NOTIFICATION_EVENTS.PLAN_CANCELLED,
    title: 'Plan cancelado',
    body: `Tu plan "${planName}" fue cancelado. Revisá el estado de tu cuenta para ver los cambios.`,
    payload: { url: `${env.appUrl}/cliente/cuenta` },
  });
}

export async function notifyReminder24h(reservation) {
  await dispatchToClient(reservation.clientId, {
    eventType: NOTIFICATION_EVENTS.REMINDER_24H,
    title: 'Recordatorio de clase',
    body: `Mañana tenés clase a las ${reservation.startTime}`,
    payload: { url: `${env.appUrl}/cliente/reservas` },
  });

  await notificationsRepository.createReminderSent(reservation.id, '24h');
}

export function runNotificationSafely(promise) {
  promise.catch((error) => {
    console.error('[NOTIFY] Error al enviar notificación:', error.message);
  });
}

/** Envía una notificación de prueba al usuario autenticado (in-app + push), sin gate de settings. */
export async function notifyTestPush({ recipientType, recipientId }) {
  const title = 'Prueba de notificación';
  const body =
    'Si ves esto en el celular con la pantalla bloqueada, el push está funcionando.';
  const payload = {
    url:
      recipientType === 'admin'
        ? `${env.appUrl}/admin`
        : `${env.appUrl}/cliente`,
  };

  await notificationsRepository.createNotificationLog({
    channel: 'in_app',
    recipientType,
    recipientId: Number(recipientId),
    eventType: 'testPush',
    title,
    body,
    payload,
    status: 'sent',
    sentAt: new Date(),
  });

  if (!pushService.isPushEnabled()) {
    throw new Error('Push no configurado en el servidor (faltan claves VAPID)');
  }

  const pushResult = await pushService.sendPushToUser(recipientType, Number(recipientId), {
    title,
    body,
    url: payload.url,
    eventType: 'testPush',
  });

  await notificationsRepository.createNotificationLog({
    channel: 'push',
    recipientType,
    recipientId: Number(recipientId),
    eventType: 'testPush',
    title,
    body:
      pushResult.sent > 0
        ? body
        : `${body}${
            pushResult.errors?.length
              ? ` [${pushResult.errors.join('; ')}]`
              : ' [sin dispositivos suscritos]'
          }`,
    payload,
    status: pushResult.sent > 0 ? 'sent' : 'failed',
    sentAt: pushResult.sent > 0 ? new Date() : null,
  });

  if (pushResult.sent === 0) {
    throw new Error(
      pushResult.errors?.includes('no_subscriptions')
        ? 'Este dispositivo no está suscrito al push. Activá las notificaciones en esta app instalada y probá de nuevo.'
        : `No se pudo enviar el push: ${pushResult.errors?.join('; ') || 'error desconocido'}`
    );
  }

  return {
    message: 'Notificación de prueba enviada. Bloqueá el teléfono y deberías verla.',
    sent: pushResult.sent,
  };
}
