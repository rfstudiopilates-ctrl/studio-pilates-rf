import * as settingsRepository from './settings.repository.js';
import { createAppError } from '../../utils/AppError.js';

export async function getPublicSettings() {
  const settings = await settingsRepository.getSettings();

  if (!settings) {
    throw createAppError('Configuración no encontrada', 404);
  }

  return settingsRepository.toPublicSettings(settings);
}

export async function getAdminSettings() {
  const settings = await settingsRepository.getSettings();

  if (!settings) {
    throw createAppError('Configuración no encontrada', 404);
  }

  return settings;
}

export async function updateAdminSettings(payload) {
  return settingsRepository.updateSettings(payload);
}
