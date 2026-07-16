/**
 * Cambia la contraseña de un admin (tabla users) o cliente (tabla clients)
 * directamente en la base de datos. Útil para rotar las credenciales demo
 * antes de habilitar producción.
 *
 * Uso contra Railway (desde tu PC):
 *   node scripts/set-password.js --type admin --username admin --password "NuevaClaveFuerte123" --url "mysql://root:PASSWORD@HOST:PUERTO/railway"
 *
 * Uso local (toma backend/.env):
 *   node scripts/set-password.js --type client --username cliente.demo --password "OtraClave456"
 */
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

dotenv.config();

const SALT_ROUNDS = 12;

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

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  };
}

async function main() {
  const args = parseArgs();
  const type = args.type;
  const username = args.username;
  const password = args.password;

  if (!['admin', 'client'].includes(type) || !username || !password) {
    console.error(
      'Uso: node scripts/set-password.js --type admin|client --username USUARIO --password "NUEVA_CLAVE" [--url "mysql://..."]'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('[SET-PASSWORD] La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const config = resolveConnectionConfig(args);
  const connection = await mysql.createConnection(config);

  try {
    const table = type === 'admin' ? 'users' : 'clients';
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await connection.query(
      `UPDATE \`${table}\` SET password_hash = ? WHERE username = ?`,
      [passwordHash, username]
    );

    if (result.affectedRows === 0) {
      console.error(`[SET-PASSWORD] No existe ${type} con usuario "${username}".`);
      process.exit(1);
    }

    console.log(`[SET-PASSWORD] Contraseña actualizada para ${type} "${username}".`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('[SET-PASSWORD] Error:', error.message);
  process.exit(1);
});
