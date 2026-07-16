import { createAppError } from '../../utils/AppError.js';
import { hashPassword } from '../../utils/crypto.js';
import { CLIENT_STATUS_LABELS } from './clients.constants.js';
import * as clientsRepository from './clients.repository.js';
import * as authRepository from '../auth/auth.repository.js';
import { expireClientPlans } from '../plans/plans.repository.js';

function trackChanges(before, after, fields) {
  const changes = {};

  fields.forEach((field) => {
    const beforeValue = before[field];
    const afterValue = after[field];

    if (beforeValue !== afterValue) {
      changes[field] = { from: beforeValue, to: afterValue };
    }
  });

  return changes;
}

export async function listClients(query) {
  await expireClientPlans();
  return clientsRepository.listClients(query);
}

export async function getClientById(id) {
  const client = await clientsRepository.findClientById(id);

  if (!client) {
    throw createAppError('Cliente no encontrado', 404);
  }

  return client;
}

export async function getClientWithHistory(id, historyQuery) {
  const client = await getClientById(id);
  const history = await clientsRepository.getClientHistory(id, historyQuery);

  return { client, history };
}

export async function createClient(payload, adminId) {
  const username = payload.username.trim();
  const phone = payload.phone?.trim() || null;

  const existingUsername = await clientsRepository.findClientByUsername(username);

  if (existingUsername) {
    throw createAppError('El nombre de usuario ya está en uso', 409, {
      username: 'El nombre de usuario ya está en uso',
    });
  }

  if (phone) {
    const existingPhone = await clientsRepository.findClientByPhone(phone);

    if (existingPhone) {
      throw createAppError('Este teléfono ya está registrado en otro cliente', 409, {
        phone: 'Este teléfono ya está registrado en otro cliente',
      });
    }
  }

  const passwordHash = await hashPassword(payload.password);

  const clientId = await clientsRepository.createClient({
    username,
    passwordHash,
    fullName: payload.fullName.trim(),
    phone,
    status: payload.status,
    internalNotes: payload.internalNotes?.trim() || null,
  });

  await clientsRepository.createClientHistory({
    clientId,
    actionType: 'client_created',
    description: `Cliente creado con estado "${CLIENT_STATUS_LABELS[payload.status]}".`,
    metadata: {
      username: payload.username.trim(),
      status: payload.status,
    },
    performedById: adminId,
  });

  return clientsRepository.findClientById(clientId);
}

export async function updateClient(id, payload, adminId) {
  const current = await clientsRepository.findClientById(id);

  if (!current) {
    throw createAppError('Cliente no encontrado', 404);
  }

  if (payload.username && payload.username.trim() !== current.username) {
    const existing = await clientsRepository.findClientByUsername(payload.username.trim());

    if (existing && existing.id !== id) {
      throw createAppError('El nombre de usuario ya está en uso', 409, {
        username: 'El nombre de usuario ya está en uso',
      });
    }
  }

  const updateFields = {};

  if (payload.phone !== undefined) {
    const nextPhone = payload.phone.trim() || null;

    if (nextPhone && nextPhone !== current.phone) {
      const existingPhone = await clientsRepository.findClientByPhone(nextPhone);

      if (existingPhone && existingPhone.id !== id) {
        throw createAppError('Este teléfono ya está registrado en otro cliente', 409, {
          phone: 'Este teléfono ya está registrado en otro cliente',
        });
      }
    }

    updateFields.phone = nextPhone;
  }

  if (payload.fullName !== undefined) updateFields.fullName = payload.fullName.trim();
  if (payload.username !== undefined) updateFields.username = payload.username.trim();
  if (payload.status !== undefined) updateFields.status = payload.status;
  if (payload.internalNotes !== undefined) {
    updateFields.internalNotes = payload.internalNotes?.trim() || null;
  }

  if (payload.password) {
    updateFields.passwordHash = await hashPassword(payload.password);

    await clientsRepository.createClientHistory({
      clientId: id,
      actionType: 'password_changed',
      description: 'Contraseña actualizada por el administrador.',
      performedById: adminId,
    });

    await authRepository.revokeAllRefreshTokens('client', id);
  }

  const updated = await clientsRepository.updateClient(id, updateFields);

  const changes = trackChanges(current, updated, [
    'fullName',
    'username',
    'phone',
    'status',
    'internalNotes',
  ]);

  if (Object.keys(changes).length > 0) {
    if (changes.status) {
      await clientsRepository.createClientHistory({
        clientId: id,
        actionType: 'status_changed',
        description: `Estado cambiado de "${CLIENT_STATUS_LABELS[changes.status.from]}" a "${CLIENT_STATUS_LABELS[changes.status.to]}".`,
        metadata: changes.status,
        performedById: adminId,
      });
    }

    if (changes.internalNotes) {
      await clientsRepository.createClientHistory({
        clientId: id,
        actionType: 'note_updated',
        description: 'Observaciones internas actualizadas.',
        performedById: adminId,
      });
    }

    const otherChanges = { ...changes };
    delete otherChanges.status;
    delete otherChanges.internalNotes;

    if (Object.keys(otherChanges).length > 0) {
      await clientsRepository.createClientHistory({
        clientId: id,
        actionType: 'client_updated',
        description: 'Datos del cliente actualizados.',
        metadata: otherChanges,
        performedById: adminId,
      });
    }
  }

  return updated;
}

export async function deleteClient(id, adminId) {
  const client = await clientsRepository.findClientById(id);

  if (!client) {
    throw createAppError('Cliente no encontrado', 404);
  }

  await clientsRepository.createClientHistory({
    clientId: id,
    actionType: 'client_deleted',
    description: `Cliente "${client.fullName}" eliminado del sistema.`,
    metadata: { username: client.username },
    performedById: adminId,
  });

  await authRepository.revokeAllRefreshTokens('client', id);
  await clientsRepository.deleteClient(id);

  return { message: 'Cliente eliminado correctamente' };
}
