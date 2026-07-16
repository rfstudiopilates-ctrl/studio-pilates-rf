/**
 * Inicializa el esquema completo (database/init.sql) en cualquier MySQL:
 * local o Railway. Se ejecuta UNA sola vez sobre una base vacía.
 *
 * Uso con URL (recomendado para Railway):
 *   node scripts/db-init.js --url "mysql://root:PASSWORD@HOST:PUERTO/railway"
 *
 * Uso con variables de entorno (backend/.env):
 *   npm run db:init
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INIT_SQL_PATH = path.resolve(__dirname, '../../database/init.sql');

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    const value = args[i + 1];
    if (key && value) {
      parsed[key] = value;
    }
  }

  return parsed;
}

function resolveConnectionConfig() {
  const args = parseArgs();
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
      'Faltan datos de conexión. Pasá --url "mysql://..." o configurá DB_HOST, DB_USER, DB_PASSWORD y DB_NAME en backend/.env'
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

function loadSchemaSql(targetDatabase) {
  if (!fs.existsSync(INIT_SQL_PATH)) {
    throw new Error(`No se encontró el archivo de esquema: ${INIT_SQL_PATH}`);
  }

  const raw = fs.readFileSync(INIT_SQL_PATH, 'utf8');

  // Quitar CREATE DATABASE / USE del init.sql: la base destino la define
  // la conexión (en Railway ya existe la base "railway").
  return raw
    .replace(/^\s*CREATE DATABASE[\s\S]*?;\s*$/im, '')
    .replace(/^\s*USE\s+\S+;\s*$/im, '')
    .concat(`\n-- Ejecutado sobre la base: ${targetDatabase}\n`);
}

async function main() {
  const config = resolveConnectionConfig();
  const sql = loadSchemaSql(config.database);

  console.log(`[DB-INIT] Conectando a ${config.host}:${config.port} ...`);

  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    multipleStatements: true,
    connectTimeout: 20000,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE \`${config.database}\``);

    const [existing] = await connection.query(
      `SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
      [config.database]
    );

    if (Number(existing[0].total) > 0) {
      console.log(
        `[DB-INIT] La base "${config.database}" ya tiene ${existing[0].total} tablas. ` +
          'El script usa CREATE TABLE IF NOT EXISTS, así que es seguro continuar.'
      );
    }

    console.log('[DB-INIT] Ejecutando database/init.sql ...');
    await connection.query(sql);

    const [tables] = await connection.query(
      `SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
      [config.database]
    );

    console.log(`[DB-INIT] Listo. Tablas en "${config.database}": ${tables[0].total}`);
    console.log('[DB-INIT] Usuarios iniciales: admin / Admin1234 y cliente.demo / Cliente1234');
    console.log('[DB-INIT] IMPORTANTE: cambiá esas contraseñas antes de usar NODE_ENV=production.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('[DB-INIT] Error:', error.message);
  process.exit(1);
});
