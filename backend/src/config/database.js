import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Parsear/serializar Date en UTC. Debe coincidir con SET time_zone de cada conexión.
  timezone: '+00:00',
});

function applyUtcSession(connection) {
  connection.query("SET time_zone = '+00:00'");
}

// mysql2/promise expone el pool interno en .pool
if (typeof pool.on === 'function') {
  pool.on('connection', applyUtcSession);
}
if (pool.pool && typeof pool.pool.on === 'function') {
  pool.pool.on('connection', applyUtcSession);
}

export async function testDatabaseConnection() {
  const connection = await pool.getConnection();

  try {
    await connection.query("SET time_zone = '+00:00'");
    await connection.ping();
    return true;
  } finally {
    connection.release();
  }
}

export async function ensureSchemaPatches() {
  const patches = [
    {
      table: 'settings',
      column: 'debt_booking_block_amount',
      ddl: `ALTER TABLE settings
            ADD COLUMN debt_booking_block_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00
            AFTER block_booking_on_debt`,
    },
    {
      table: 'clients',
      column: 'pwa_installed_at',
      ddl: `ALTER TABLE clients
            ADD COLUMN pwa_installed_at TIMESTAMP NULL DEFAULT NULL
            AFTER last_login_at`,
    },
    {
      table: 'users',
      column: 'pwa_installed_at',
      ddl: `ALTER TABLE users
            ADD COLUMN pwa_installed_at TIMESTAMP NULL DEFAULT NULL
            AFTER last_login_at`,
    },
  ];

  for (const patch of patches) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
      [patch.table, patch.column]
    );

    if (Number(rows[0].total) === 0) {
      await pool.query(patch.ddl);
      console.log(`[DB] Columna agregada: ${patch.table}.${patch.column}`);
    }
  }
}

export async function verifyRequiredSchema() {
  const requiredColumns = [
    { table: 'clients', column: 'deleted_at' },
    { table: 'settings', column: 'pending_hold_hours' },
    { table: 'settings', column: 'block_booking_on_debt' },
    { table: 'settings', column: 'debt_booking_block_amount' },
  ];

  for (const { table, column } of requiredColumns) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
      [table, column]
    );

    if (Number(rows[0].total) === 0) {
      throw new Error(
        `Falta la columna ${table}.${column}. Ejecutá database/init.sql en una base nueva.`
      );
    }
  }
}
