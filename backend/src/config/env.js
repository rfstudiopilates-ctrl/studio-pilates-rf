import dotenv from 'dotenv';

dotenv.config();

// PORT lo inyecta Railway automáticamente; no lo exigimos a mano.
const requiredEnvVars = [
  'CORS_ORIGIN',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_NAME',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  throw new Error(`Faltan variables de entorno requeridas: ${missingVars.join(', ')}`);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const WEAK_SECRET_MARKERS = [
  'cambiar_en_produccion',
  'dev_access_secret',
  'dev_refresh_secret',
  'change_me',
  'changeme',
  'password',
  '123456',
];

function parseCorsOrigins(raw) {
  return String(raw || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function assertStrongSecret(name, value) {
  if (!value || value.length < 32) {
    throw new Error(
      `[SEGURIDAD] ${name} debe tener al menos 32 caracteres en producción.`
    );
  }

  const normalized = value.toLowerCase();
  if (WEAK_SECRET_MARKERS.some((marker) => normalized.includes(marker))) {
    throw new Error(
      `[SEGURIDAD] ${name} parece un valor de ejemplo/desarrollo. Generá un secreto aleatorio fuerte.`
    );
  }
}

function assertProductionHttpsUrl(name, value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      throw new Error(`[SEGURIDAD] ${name} debe usar HTTPS en producción (${value}).`);
    }
  } catch (error) {
    if (error.message.startsWith('[SEGURIDAD]')) {
      throw error;
    }
    throw new Error(`[SEGURIDAD] ${name} no es una URL válida: ${value}`);
  }
}

const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);
const appUrl = process.env.APP_URL || corsOrigins[0] || 'http://localhost:5173';
const allowDemoCredentials = process.env.ALLOW_DEMO_CREDENTIALS === 'true';

const cookieSameSiteRaw = (process.env.AUTH_COOKIE_SAMESITE || '').toLowerCase();
const cookieSameSite = ['strict', 'lax', 'none'].includes(cookieSameSiteRaw)
  ? cookieSameSiteRaw
  : isProduction
    ? 'none'
    : 'strict';

if (isProduction) {
  if (corsOrigins.length === 0) {
    throw new Error('[SEGURIDAD] CORS_ORIGIN es obligatorio en producción.');
  }

  for (const origin of corsOrigins) {
    assertProductionHttpsUrl('CORS_ORIGIN', origin);
  }

  assertProductionHttpsUrl('APP_URL', appUrl);

  if (!process.env.DB_PASSWORD) {
    throw new Error('[SEGURIDAD] DB_PASSWORD es obligatorio en producción.');
  }

  assertStrongSecret('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET);
  assertStrongSecret('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET);

  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error('[SEGURIDAD] JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben ser distintos.');
  }

  if (cookieSameSite === 'none' && process.env.AUTH_COOKIE_SECURE === 'false') {
    throw new Error('[SEGURIDAD] AUTH_COOKIE_SAMESITE=none requiere cookies secure.');
  }
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT) || 3001,
  appUrl,
  corsOrigin: corsOrigins[0],
  corsOrigins,
  allowDemoCredentials,
  authCookie: {
    sameSite: cookieSameSite,
    secure:
      process.env.AUTH_COOKIE_SECURE === 'true' ||
      (process.env.AUTH_COOKIE_SECURE !== 'false' &&
        (isProduction || cookieSameSite === 'none')),
  },
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  timezone: process.env.TZ || 'America/Argentina/Buenos_Aires',
  classGenerationWeeksAhead: Number(process.env.CLASS_GENERATION_WEEKS_AHEAD) || 8,
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@studiopilatesrf.com',
  },
  isProduction,
};

if (isProduction && (!env.vapid.publicKey || !env.vapid.privateKey)) {
  console.warn(
    '[SEGURIDAD] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY no configuradas. Push PWA deshabilitado.'
  );
}
