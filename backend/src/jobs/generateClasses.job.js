import cron from 'node-cron';
import { env } from '../config/env.js';
import { generateClasses } from '../modules/classes/classes.generation.js';
import { processRecurringReservations } from '../modules/reservations/reservations.service.js';

let isRunning = false;

export async function runClassGenerationJob(source = 'manual') {
  if (isRunning) {
    console.log('[JOB] Generación de clases ya en ejecución, se omite');
    return null;
  }

  isRunning = true;

  try {
    const result = await generateClasses();
    console.log(
      `[JOB] Clases generadas (${source}): ${result.created} nuevas, ${result.skipped} existentes (${result.from} → ${result.to})`
    );

    const recurring = await processRecurringReservations();
    console.log(
      `[JOB] Reservas recurrentes (${source}): ${recurring.created} nuevas, ${recurring.skipped} omitidas, ${recurring.errors} errores`
    );

    return { classes: result, recurring };
  } catch (error) {
    console.error('[JOB] Error al generar clases:', error.message);
    throw error;
  } finally {
    isRunning = false;
  }
}

export function startClassGenerationCron() {
  cron.schedule(
    '5 0 * * *',
    () => {
      runClassGenerationJob('cron').catch(() => {});
    },
    { timezone: env.timezone }
  );

  console.log(`[JOB] Cron de generación de clases activo (00:05 ${env.timezone})`);
}
