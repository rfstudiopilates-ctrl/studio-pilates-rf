import { createAppError } from '../../utils/AppError.js';
import { hashPassword } from '../../utils/crypto.js';
import * as adminsRepository from './admins.repository.js';
import * as authRepository from '../auth/auth.repository.js';

export async function listAdmins(query) {
  return adminsRepository.listAdmins(query);
}

export async function getAdminById(id) {
  const admin = await adminsRepository.findAdminById(id);

  if (!admin) {
    throw createAppError('Administrador no encontrado', 404);
  }

  return admin;
}

export async function createAdmin(payload) {
  const email = payload.email.trim().toLowerCase();
  const username = payload.username.trim();
  const fullName = payload.fullName.trim();

  const existingEmail = await adminsRepository.findAdminByEmail(email);
  if (existingEmail) {
    throw createAppError('Este email ya está en uso', 409, {
      email: 'Este email ya está en uso',
    });
  }

  const existingUsername = await adminsRepository.findAdminByUsername(username);
  if (existingUsername) {
    throw createAppError('El nombre de usuario ya está en uso', 409, {
      username: 'El nombre de usuario ya está en uso',
    });
  }

  const passwordHash = await hashPassword(payload.password);
  const admin = await adminsRepository.createAdmin({
    email,
    username,
    passwordHash,
    fullName,
  });

  return admin;
}

export async function updateAdmin(id, payload, actorAdminId) {
  const current = await getAdminById(id);
  const fields = {};
  const actorId = Number(actorAdminId);

  if (payload.email !== undefined) {
    const email = payload.email.trim().toLowerCase();
    if (email !== current.email) {
      const existing = await adminsRepository.findAdminByEmail(email);
      if (existing && existing.id !== id) {
        throw createAppError('Este email ya está en uso', 409, {
          email: 'Este email ya está en uso',
        });
      }
    }
    fields.email = email;
  }

  if (payload.username !== undefined) {
    const username = payload.username.trim();
    if (username !== current.username) {
      const existing = await adminsRepository.findAdminByUsername(username);
      if (existing && existing.id !== id) {
        throw createAppError('El nombre de usuario ya está en uso', 409, {
          username: 'El nombre de usuario ya está en uso',
        });
      }
    }
    fields.username = username;
  }

  if (payload.fullName !== undefined) {
    fields.fullName = payload.fullName.trim();
  }

  if (payload.password) {
    fields.passwordHash = await hashPassword(payload.password);
  }

  if (payload.isActive !== undefined) {
    if (payload.isActive === false) {
      if (id === actorId) {
        throw createAppError('No podés desactivar tu propia cuenta.', 400);
      }

      if (current.isActive) {
        const activeCount = await adminsRepository.countActiveAdmins();
        if (activeCount <= 1) {
          throw createAppError(
            'No se puede desactivar al único administrador activo. Creá otro admin antes.',
            400
          );
        }
      }
    }

    fields.isActive = payload.isActive;
  }

  const updated = await adminsRepository.updateAdmin(id, fields);

  if (payload.password || payload.isActive === false) {
    await authRepository.revokeAllRefreshTokens('admin', id);
  }

  return updated;
}

export async function deactivateAdmin(id, actorAdminId) {
  const current = await getAdminById(id);
  const actorId = Number(actorAdminId);

  if (id === actorId) {
    throw createAppError('No podés desactivar tu propia cuenta.', 400);
  }

  if (!current.isActive) {
    return {
      admin: current,
      message: `"${current.fullName}" ya estaba desactivado.`,
    };
  }

  const activeCount = await adminsRepository.countActiveAdmins();
  if (activeCount <= 1) {
    throw createAppError(
      'No se puede desactivar al único administrador activo. Creá otro admin antes.',
      400
    );
  }

  const admin = await adminsRepository.updateAdmin(id, { isActive: false });
  await authRepository.revokeAllRefreshTokens('admin', id);

  return {
    admin,
    message: `"${admin.fullName}" fue desactivado y ya no podrá iniciar sesión.`,
  };
}
