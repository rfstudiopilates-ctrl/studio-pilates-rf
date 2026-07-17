import { env } from '../../config/env.js';
import { createAppError } from '../../utils/AppError.js';
import {
  comparePassword,
  generateSecureToken,
  getRefreshTokenExpiryDate,
  getResetTokenExpiryDate,
  hashPassword,
  hashToken,
} from '../../utils/crypto.js';
import { signAccessToken } from '../../utils/jwt.js';
import * as authRepository from './auth.repository.js';
import * as clientsRepository from '../clients/clients.repository.js';

function sanitizeAdmin(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.full_name,
    role: 'admin',
    pwaInstalled: Boolean(user.pwa_installed_at || user.pwaInstalled),
  };
}

function sanitizeClient(client) {
  return {
    id: client.id,
    username: client.username,
    fullName: client.fullName,
    phone: client.phone,
    status: client.status,
    role: 'client',
    pwaInstalled: Boolean(client.pwaInstalled),
  };
}

function buildAccessToken(subject) {
  return signAccessToken({
    sub: subject.id,
    role: subject.role,
  });
}

async function issueAuthSession(subjectType, subject, role) {
  const accessToken = buildAccessToken({ id: subject.id, role });
  const refreshToken = generateSecureToken(48);
  const refreshTokenHash = hashToken(refreshToken);

  await authRepository.createRefreshToken({
    subjectType,
    subjectId: subject.id,
    tokenHash: refreshTokenHash,
    expiresAt: getRefreshTokenExpiryDate(env.jwt.refreshExpiresIn),
  });

  return {
    accessToken,
    refreshToken,
    user: role === 'admin' ? sanitizeAdmin(subject) : sanitizeClient(subject),
  };
}

export async function login({ username, password }) {
  const normalizedUsername = username.trim();

  const admin = await authRepository.findAdminByUsername(normalizedUsername);

  if (admin) {
    if (!admin.is_active) {
      throw createAppError('Credenciales inválidas', 401);
    }

    const isValidPassword = await comparePassword(password, admin.password_hash);

    if (!isValidPassword) {
      throw createAppError('Credenciales inválidas', 401);
    }

    await authRepository.updateAdminLastLogin(admin.id);
    return issueAuthSession('admin', admin, 'admin');
  }

  const client = await clientsRepository.findClientByUsername(normalizedUsername);

  if (!client) {
    throw createAppError('Credenciales inválidas', 401);
  }

  if (client.status === 'suspended') {
    throw createAppError('Tu cuenta está suspendida. Contactá al estudio.', 403);
  }

  const isValidPassword = await comparePassword(password, client.passwordHash);

  if (!isValidPassword) {
    throw createAppError('Credenciales inválidas', 401);
  }

  await clientsRepository.updateClientLastLogin(client.id);
  return issueAuthSession('client', client, 'client');
}

export async function loginAdmin({ email, password }) {
  const admin = await authRepository.findAdminByEmail(email.toLowerCase().trim());

  if (!admin || !admin.is_active) {
    throw createAppError('Credenciales inválidas', 401);
  }

  const isValidPassword = await comparePassword(password, admin.password_hash);

  if (!isValidPassword) {
    throw createAppError('Credenciales inválidas', 401);
  }

  await authRepository.updateAdminLastLogin(admin.id);

  return issueAuthSession('admin', admin, 'admin');
}

export async function loginClient({ username, password }) {
  const client = await clientsRepository.findClientByUsername(username.trim());

  if (!client) {
    throw createAppError('Credenciales inválidas', 401);
  }

  if (client.status === 'suspended') {
    throw createAppError('Tu cuenta está suspendida. Contactá al estudio.', 403);
  }

  const isValidPassword = await comparePassword(password, client.passwordHash);

  if (!isValidPassword) {
    throw createAppError('Credenciales inválidas', 401);
  }

  await clientsRepository.updateClientLastLogin(client.id);

  return issueAuthSession('client', client, 'client');
}

export async function refreshSession(refreshToken) {
  if (!refreshToken) {
    throw createAppError('Sesión no válida', 401);
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = await authRepository.findRefreshTokenByHash(tokenHash);

  if (!storedToken || storedToken.revoked_at) {
    throw createAppError('Sesión no válida', 401);
  }

  if (new Date(storedToken.expires_at) < new Date()) {
    await authRepository.revokeRefreshToken(tokenHash);
    throw createAppError('Sesión expirada', 401);
  }

  // Rotación: el refresh token actual se invalida y se emite uno nuevo.
  await authRepository.revokeRefreshToken(tokenHash);

  let subject = null;

  if (storedToken.subject_type === 'admin') {
    subject = await authRepository.findAdminById(storedToken.subject_id);

    if (!subject || !subject.is_active) {
      throw createAppError('Usuario no disponible', 401);
    }

    const nextSession = await issueAuthSession('admin', subject, 'admin');
    return {
      accessToken: nextSession.accessToken,
      refreshToken: nextSession.refreshToken,
      user: nextSession.user,
    };
  }

  subject = await clientsRepository.findClientById(storedToken.subject_id);

  if (!subject || subject.status === 'suspended') {
    throw createAppError('Usuario no disponible', 401);
  }

  const nextSession = await issueAuthSession('client', subject, 'client');
  return {
    accessToken: nextSession.accessToken,
    refreshToken: nextSession.refreshToken,
    user: nextSession.user,
  };
}

export async function logout(refreshToken) {
  if (!refreshToken) {
    return;
  }

  const tokenHash = hashToken(refreshToken);
  await authRepository.revokeRefreshToken(tokenHash);
}

export async function getAuthenticatedUser(role, id) {
  if (role === 'admin') {
    const admin = await authRepository.findAdminById(id);

    if (!admin || !admin.is_active) {
      throw createAppError('Usuario no encontrado', 404);
    }

    return sanitizeAdmin(admin);
  }

  const client = await clientsRepository.findClientById(id);

  if (!client) {
    throw createAppError('Usuario no encontrado', 404);
  }

  return sanitizeClient(client);
}

export async function requestPasswordReset(email) {
  const admin = await authRepository.findAdminByEmail(email.toLowerCase().trim());

  if (!admin || !admin.is_active) {
    return { message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.' };
  }

  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);

  await authRepository.invalidatePasswordResetTokens(admin.id);
  await authRepository.createPasswordResetToken({
    userId: admin.id,
    tokenHash,
    expiresAt: getResetTokenExpiryDate(1),
  });

  const resetUrl = `${env.appUrl}/reset-password?token=${rawToken}`;

  if (!env.isProduction) {
    console.log('[AUTH] Enlace de recuperación (solo desarrollo):', resetUrl);
  }

  return {
    message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.',
    ...(env.isProduction ? {} : { devResetUrl: resetUrl }),
  };
}

export async function resetPassword({ token, password }) {
  const tokenHash = hashToken(token);
  const resetToken = await authRepository.findPasswordResetTokenByHash(tokenHash);

  if (!resetToken || resetToken.used_at) {
    throw createAppError('El enlace de recuperación no es válido o ya fue utilizado', 400);
  }

  if (new Date(resetToken.expires_at) < new Date()) {
    throw createAppError('El enlace de recuperación expiró', 400);
  }

  const passwordHash = await hashPassword(password);

  await authRepository.updateAdminPassword(resetToken.user_id, passwordHash);
  await authRepository.markPasswordResetTokenUsed(tokenHash);
  await authRepository.revokeAllRefreshTokens('admin', resetToken.user_id);

  return { message: 'Contraseña actualizada correctamente' };
}

export async function changePassword({ role, id, currentPassword, newPassword }) {
  if (role === 'admin') {
    const admin = await authRepository.findAdminWithPasswordById(id);

    if (!admin || !admin.is_active) {
      throw createAppError('Usuario no encontrado', 404);
    }

    const isValid = await comparePassword(currentPassword, admin.password_hash);

    if (!isValid) {
      throw createAppError('La contraseña actual es incorrecta', 400);
    }

    const passwordHash = await hashPassword(newPassword);
    await authRepository.updateAdminPassword(id, passwordHash);
    await authRepository.revokeAllRefreshTokens('admin', id);

    return { message: 'Contraseña actualizada correctamente' };
  }

  const client = await clientsRepository.findClientWithPasswordById(id);

  if (!client || client.status === 'suspended') {
    throw createAppError('Usuario no encontrado', 404);
  }

  const isValid = await comparePassword(currentPassword, client.passwordHash);

  if (!isValid) {
    throw createAppError('La contraseña actual es incorrecta', 400);
  }

  const passwordHash = await hashPassword(newPassword);
  await clientsRepository.updateClient(id, { passwordHash });
  await authRepository.revokeAllRefreshTokens('client', id);

  return { message: 'Contraseña actualizada correctamente' };
}

export async function markPwaInstalled(role, id) {
  if (role === 'admin') {
    await authRepository.markAdminPwaInstalled(id);
  } else {
    await clientsRepository.markClientPwaInstalled(id);
  }

  return getAuthenticatedUser(role, id);
}
