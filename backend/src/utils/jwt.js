import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createAppError } from './AppError.js';

export function signAccessToken(payload) {
  return jwt.sign(
    {
      ...payload,
      type: 'access',
    },
    env.jwt.accessSecret,
    {
      expiresIn: env.jwt.accessExpiresIn,
    }
  );
}

export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret);

    if (decoded.type !== 'access') {
      throw createAppError('Token inválido', 401);
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw createAppError('Sesión expirada', 401);
    }

    throw createAppError('Token inválido', 401);
  }
}
