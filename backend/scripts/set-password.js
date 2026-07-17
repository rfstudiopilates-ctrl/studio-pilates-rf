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

const PLACEHOLDER_PASSWORDS = [
  'tu_clave_admin_fuerte',
  'otra_clave_fuerte',
  'nueva_clave',
  'changeme',
  'admin1234',
  'cliente1234',
];

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let i = 0; i < args.length; i += 1) {
    const raw = args[i];
    if (!raw?.startsWith('--')) {
      continue;
    }

    const body = raw.slice(2);
    const eqIndex = body.indexOf('=');

    if (eqIndex >= 0) {
      const key = body.slice(0, eqIndex);
      const value = body.slice(eqIndex + 1);
      if (key && value) {
        parsed[key] = value;
      }
      continue;
    }

    const key = body;
    const value = args[i + 1];
    if (key && value && !value.startsWith('--')) {
      parsed[key] = value;
      i += 1;
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
      source: 'url',
    };
  }

  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    throw new Error(
      'Falta --url "mysql://...". Para Railway copiá MYSQL_PUBLIC_URL del servicio MySQL.'
    );
  }

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    source: 'env',
  };
}

async function main() {
  const args = parseArgs();
  const type = args.type;
  const username = args.username;
  const password = args.password;

  if (!['admin', 'client'].includes(type) || !username || !password) {
    console.error(
      'Uso: node scripts/set-password.js --type admin|client --username USUARIO --password "NUEVA_CLAVE" --url "mysql://..."'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('[SET-PASSWORD] La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  if (PLACEHOLDER_PASSWORDS.includes(password.toLowerCase())) {
    console.error(
      '[SET-PASSWORD] Esa parece una contraseña de ejemplo del DEPLOY.md. Elegí una clave real tuya.'
    );
    process.exit(1);
  }

  const config = resolveConnectionConfig(args);
  console.log(
    `[SET-PASSWORD] Conectando a ${config.host}:${config.port}/${config.database} (${config.source}) ...`
  );

  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  });

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
    console.log('[SET-PASSWORD] Ahora Redeploy en Railway (o esperá el restart automático).');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('[SET-PASSWORD] Error:', error.message);
  process.exit(1);
});
