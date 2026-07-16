import { env } from '../config/env.js';
import { parseDurationToMs } from './crypto.js';

const REFRESH_COOKIE_NAME = 'refresh_token';

export function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.authCookie.secure,
    sameSite: env.authCookie.sameSite,
    path: '/api/auth',
    maxAge: parseDurationToMs(env.jwt.refreshExpiresIn),
  };
}

export function setRefreshTokenCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, getRefreshCookieOptions());
}

export function clearRefreshTokenCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.authCookie.secure,
    sameSite: env.authCookie.sameSite,
    path: '/api/auth',
  });
}

export function getRefreshTokenFromRequest(req) {
  return req.cookies?.[REFRESH_COOKIE_NAME] || null;
}

export { REFRESH_COOKIE_NAME };
