import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

const SALT_ROUNDS = 12;

/**
 * Hash opaco de tokens (refresh / reset) con pepper del JWT_REFRESH_SECRET.
 * Así el secreto de entorno se usa de verdad y un dump de DB no basta para forjar tokens.
 */
export function hashToken(token) {
  return crypto
    .createHmac('sha256', env.jwt.refreshSecret)
    .update(String(token))
    .digest('hex');
}

export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function parseDurationToMs(duration) {
  const match = /^(\d+)([smhd])$/.exec(duration);

  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

export function getRefreshTokenExpiryDate(duration) {
  return new Date(Date.now() + parseDurationToMs(duration));
}

export function getResetTokenExpiryDate(hours = 1) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
