import cron from 'node-cron';
import { env } from '../config/env.js';
import { expireStalePendingReservations } from '../modules/reservations/reservations.service.js';

let isRunning = false;

export async function runExpirePendingHoldsJob(source = 'manual') {
  if (isRunning) {
    console.log('[JOB] Expiración de holds pending ya en ejecución, se omite');
    return null;
  }

  isRunning = true;

  try {
    return await expireStalePendingReservations({ source });
  } catch (error) {
    console.error('[JOB] Error expirando holds pending:', error.message);
    throw error;
  } finally {
    isRunning = false;
  }
}

export function startExpirePendingHoldsCron() {
  // Cada 15 minutos libera cupos de solicitudes drop-in vencidas.
  cron.schedule(
    '*/15 * * * *',
    () => {
      runExpirePendingHoldsJob('cron').catch(() => {});
    },
    { timezone: env.timezone }
  );

  console.log(`[JOB] Cron de holds pending activo (cada 15 min ${env.timezone})`);
}
