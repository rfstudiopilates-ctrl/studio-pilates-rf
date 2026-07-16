import cron from 'node-cron';
import { env } from '../config/env.js';
import { getHoursUntilClass } from '../utils/dates.js';
import * as notificationsRepository from '../modules/notifications/notifications.repository.js';
import {
  notifyReminder24h,
} from '../modules/notifications/notifications.dispatcher.js';

let isRunning = false;

export async function runClassRemindersJob(source = 'manual') {
  if (isRunning) {
    console.log('[JOB] Recordatorios ya en ejecución, se omite');
    return null;
  }

  isRunning = true;

  try {
    const candidates = await notificationsRepository.listReservationsFor24hReminder();
    let sent = 0;

    for (const reservation of candidates) {
      const hoursUntil = getHoursUntilClass(reservation.classDate, reservation.startTime);

      if (hoursUntil < 23 || hoursUntil > 25) {
        continue;
      }

      await notifyReminder24h(reservation);
      sent += 1;
    }

    console.log(`[JOB] Recordatorios 24h (${source}): ${sent} enviados`);
    return { sent, checked: candidates.length };
  } catch (error) {
    console.error('[JOB] Error en recordatorios 24h:', error.message);
    throw error;
  } finally {
    isRunning = false;
  }
}

export function startClassRemindersCron() {
  cron.schedule(
    '0 * * * *',
    () => {
      runClassRemindersJob('cron').catch(() => {});
    },
    { timezone: env.timezone }
  );

  console.log(`[JOB] Cron de recordatorios 24h activo (cada hora ${env.timezone})`);
}
