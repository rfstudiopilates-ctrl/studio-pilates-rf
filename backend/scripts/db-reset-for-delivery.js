/**
 * Limpia la base de datos de prueba para entrega al cliente.
 *
 * CONSERVA (configuración del estudio):
 *   - settings
 *   - plans (catálogo)
 *   - schedule_templates (horarios semanales)
 *   - generated_classes (cupos en 0)
 *   - UN administrador (por defecto el más antiguo activo)
 *
 * ELIMINA (datos operativos / de prueba):
 *   - clientes e historial
 *   - planes asignados, finanzas, comprobantes
 *   - reservas, créditos, cambios de horario
 *   - notificaciones, push, refresh tokens de clientes
 *   - admins extra (si hay más de uno)
 *
 * Uso (Railway, desde tu PC):
 *   node scripts/db-reset-for-delivery.js --url "mysql://..." --confirm ENTREGA
 *
 * Opciones:
 *   --keep-admin admin     Username del admin a conservar (opcional)
 *   --wipe-catalog         También borra planes, horarios y clases generadas
 *   --dry-run              Solo muestra qué haría, no escribe
 */
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { confirm: null, keepAdmin: null, wipeCatalog: false, dryRun: false, url: null };

  for (let i = 0; i < args.length; i += 1) {
    const raw = args[i];
    if (!raw?.startsWith('--')) continue;

    const body = raw.slice(2);
    const eqIndex = body.indexOf('=');
    let key;
    let value;

    if (eqIndex >= 0) {
      key = body.slice(0, eqIndex);
      value = body.slice(eqIndex + 1);
    } else {
      key = body;
      value = args[i + 1];
      if (value && !value.startsWith('--')) {
        i += 1;
      } else {
        value = true;
      }
    }

    if (key === 'confirm') parsed.confirm = String(value);
    if (key === 'keep-admin') parsed.keepAdmin = String(value);
    if (key === 'wipe-catalog') parsed.wipeCatalog = true;
    if (key === 'dry-run') parsed.dryRun = true;
    if (key === 'url') parsed.url = String(value);
  }

  return parsed;
}

function resolveConnectionConfig(args) {
  const url = args.url || process.env.MYSQL_URL || process.env.DATABASE_URL;

  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 3306,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, '') || 'railway',
    };
  }

  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    throw new Error(
      'Falta --url "mysql://...". Para Railway usá MYSQL_PUBLIC_URL del servicio MySQL.'
    );
  }

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  };
}

async function count(connection, sql, params = []) {
  const [rows] = await connection.query(sql, params);
  return Number(rows[0]?.total || 0);
}

async function main() {
  const args = parseArgs();

  if (args.confirm !== 'ENTREGA') {
    console.error(`
⚠️  Esta operación borra datos de clientes, reservas y finanzas.

Para ejecutarla de verdad:
  node scripts/db-reset-for-delivery.js --url "mysql://..." --confirm ENTREGA

Opciones útiles:
  --keep-admin admin     Conserva ese username de admin
  --wipe-catalog         También limpia planes/horarios/clases
  --dry-run              Simula sin borrar
`);
    process.exit(1);
  }

  const dbConfig = resolveConnectionConfig(args);
  const connection = await mysql.createConnection({
    ...dbConfig,
    multipleStatements: false,
  });

  console.log(`[RESET] Conectado a ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  if (args.dryRun) {
    console.log('[RESET] Modo dry-run: no se escribirá nada.');
  }

  try {
    const before = {
      clients: await count(connection, 'SELECT COUNT(*) AS total FROM clients'),
      reservations: await count(connection, 'SELECT COUNT(*) AS total FROM class_reservations'),
      movements: await count(connection, 'SELECT COUNT(*) AS total FROM financial_movements'),
      notifications: await count(connection, 'SELECT COUNT(*) AS total FROM notification_logs'),
      admins: await count(connection, 'SELECT COUNT(*) AS total FROM users'),
      plans: await count(connection, 'SELECT COUNT(*) AS total FROM plans'),
      schedules: await count(connection, 'SELECT COUNT(*) AS total FROM schedule_templates'),
      classes: await count(connection, 'SELECT COUNT(*) AS total FROM generated_classes'),
    };

    console.log('[RESET] Estado actual:', before);

    const [admins] = await connection.query(
      `SELECT id, username, email, full_name, is_active
       FROM users
       ORDER BY is_active DESC, id ASC`
    );

    if (!admins.length) {
      throw new Error('No hay ningún administrador en la tabla users. Abortando.');
    }

    let keepAdmin = null;
    if (args.keepAdmin) {
      keepAdmin = admins.find((row) => row.username === args.keepAdmin) || null;
      if (!keepAdmin) {
        throw new Error(`No existe el admin con username "${args.keepAdmin}".`);
      }
    } else {
      keepAdmin = admins.find((row) => Number(row.is_active) === 1) || admins[0];
    }

    console.log(
      `[RESET] Admin a conservar: #${keepAdmin.id} ${keepAdmin.username} (${keepAdmin.full_name})`
    );

    if (args.dryRun) {
      console.log('[RESET] Dry-run finalizado. No se modificó la base.');
      return;
    }

    await connection.beginTransaction();

    // Orden cuidadoso por FKs / referencias circulares.
    const steps = [
      ['notification_reminders', 'DELETE FROM notification_reminders'],
      ['schedule_change_requests', 'DELETE FROM schedule_change_requests'],
      ['payment_receipts', 'DELETE FROM payment_receipts'],
      [
        'recovery_credits.used_reservation_id',
        'UPDATE recovery_credits SET used_reservation_id = NULL',
      ],
      ['class_reservations', 'DELETE FROM class_reservations'],
      ['recovery_credits', 'DELETE FROM recovery_credits'],
      ['recurring_reservations', 'DELETE FROM recurring_reservations'],
      ['client_plans', 'DELETE FROM client_plans'],
      ['financial_movements', 'DELETE FROM financial_movements'],
      ['client_history', 'DELETE FROM client_history'],
      ['clients', 'DELETE FROM clients'],
      ['notification_logs', 'DELETE FROM notification_logs'],
      ['push_subscriptions', 'DELETE FROM push_subscriptions'],
      [
        'refresh_tokens (clientes)',
        "DELETE FROM refresh_tokens WHERE subject_type = 'client'",
      ],
      [
        'refresh_tokens (admins extra)',
        'DELETE FROM refresh_tokens WHERE subject_type = ? AND subject_id <> ?',
        ['admin', keepAdmin.id],
      ],
      [
        'password_reset_tokens (admins extra)',
        'DELETE FROM password_reset_tokens WHERE user_id <> ?',
        [keepAdmin.id],
      ],
      ['users (admins extra)', 'DELETE FROM users WHERE id <> ?', [keepAdmin.id]],
      [
        'generated_classes.booked_count',
        'UPDATE generated_classes SET booked_count = 0',
      ],
    ];

    if (args.wipeCatalog) {
      steps.push(
        ['generated_classes', 'DELETE FROM generated_classes'],
        ['schedule_templates', 'DELETE FROM schedule_templates'],
        ['settings.drop_in_plan_id', 'UPDATE settings SET drop_in_plan_id = NULL WHERE id = 1'],
        ['plans', 'DELETE FROM plans']
      );
    }

    for (const [label, sql, params = []] of steps) {
      const [result] = await connection.query(sql, params);
      const affected = result.affectedRows ?? 0;
      console.log(`[RESET] ${label}: ${affected} fila(s)`);
    }

    // Asegura admin activo.
    await connection.query('UPDATE users SET is_active = 1 WHERE id = ?', [keepAdmin.id]);

    await connection.commit();

    const after = {
      clients: await count(connection, 'SELECT COUNT(*) AS total FROM clients'),
      reservations: await count(connection, 'SELECT COUNT(*) AS total FROM class_reservations'),
      movements: await count(connection, 'SELECT COUNT(*) AS total FROM financial_movements'),
      notifications: await count(connection, 'SELECT COUNT(*) AS total FROM notification_logs'),
      admins: await count(connection, 'SELECT COUNT(*) AS total FROM users'),
      plans: await count(connection, 'SELECT COUNT(*) AS total FROM plans'),
      schedules: await count(connection, 'SELECT COUNT(*) AS total FROM schedule_templates'),
      classes: await count(connection, 'SELECT COUNT(*) AS total FROM generated_classes'),
    };

    console.log('\n[RESET] Limpieza completada.');
    console.log('[RESET] Estado final:', after);
    console.log(`
Listo para entrega.
Conservado:
  - Admin: ${keepAdmin.username}
  - Settings del estudio
  - Catálogo de planes: ${after.plans}
  - Horarios semanales: ${after.schedules}
  - Clases generadas (cupos en 0): ${after.classes}

Recomendado después:
  1) Entrar como admin y verificar login.
  2) Revisar Configuración (WhatsApp, notificaciones, plan de clase puntual).
  3) Si querés otra clave:
     npm run set:password -- --type admin --username ${keepAdmin.username} --password "NuevaClaveFuerte" --url "..."
`);
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // ignore
    }
    console.error('[RESET] Error:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main();
