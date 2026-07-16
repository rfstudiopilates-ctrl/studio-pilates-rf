import { createApp } from './app.js';
import { env } from './config/env.js';
import { testDatabaseConnection, ensureSchemaPatches, verifyRequiredSchema } from './config/database.js';
import { assertProductionCredentialSafety } from './config/productionSafety.js';
import {
  runClassGenerationJob,
  startClassGenerationCron,
} from './jobs/generateClasses.job.js';
import {
  runClassRemindersJob,
  startClassRemindersCron,
} from './jobs/classReminders.job.js';
import {
  runExpirePendingHoldsJob,
  startExpirePendingHoldsCron,
} from './jobs/expirePendingHolds.job.js';

const app = createApp();

async function startServer() {
  try {
    await testDatabaseConnection();
    await ensureSchemaPatches();
    await verifyRequiredSchema();
    console.log('[DB] Conexión a MySQL establecida correctamente');
    await assertProductionCredentialSafety();
  } catch (error) {
    console.error('[DB] No se pudo iniciar la API:', error.message);
    console.error('[DB] Verificá MySQL, database/init.sql y la seguridad de producción.');
    process.exit(1);
  }

  startClassGenerationCron();
  startClassRemindersCron();
  startExpirePendingHoldsCron();
  runClassGenerationJob('startup').catch(() => {});
  runClassRemindersJob('startup').catch(() => {});
  runExpirePendingHoldsJob('startup').catch(() => {});

  app.listen(env.port, () => {
    console.log(`[API] Servidor corriendo en http://localhost:${env.port}`);
    console.log(`[API] Health check: http://localhost:${env.port}/api/health`);
    console.log(`[API] Entorno: ${env.nodeEnv}`);
    console.log(
      `[API] CORS: ${env.corsOrigins.join(', ')} | cookie sameSite=${env.authCookie.sameSite}`
    );
  });
}

startServer();
