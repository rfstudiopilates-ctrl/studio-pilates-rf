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
    return;
  }

  const pushResult = await pushService.sendPushToUser(recipientType, recipientId, {
    title,
    body,
    url: payload?.url || env.appUrl,
    eventType,
  });

  if (pushResult.sent === 0) {
    console.warn(
      `[NOTIFY] Push sin dispositivos para ${recipientType}#${recipientId} (${eventType}).`
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

export async function notifyReservationApproved({ reservation, clientId }) {
  const when = formatWhen(reservation);

  await dispatchToClient(clientId, {
    eventType: NOTIFICATION_EVENTS.RESERVATION_APPROVED,
    title: 'Reserva confirmada',
    body: `Tu clase${when} fue confirmada`,
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
