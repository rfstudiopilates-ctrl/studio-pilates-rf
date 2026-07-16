import * as settingsService from './settings.service.js';

function sendSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json({ success: true, data });
}

export async function getPublicSettings(req, res, next) {
  try {
    const settings = await settingsService.getPublicSettings();
    sendSuccess(res, { settings });
  } catch (error) {
    next(error);
  }
}

export async function getAdminSettings(req, res, next) {
  try {
    const settings = await settingsService.getAdminSettings();
    sendSuccess(res, { settings });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const settings = await settingsService.updateAdminSettings(req.validatedBody);
    sendSuccess(res, { settings, message: 'Configuración actualizada correctamente' });
  } catch (error) {
    next(error);
  }
}
