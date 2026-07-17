import * as adminsService from './admins.service.js';

function sendSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json({ success: true, data });
}

export async function listAdmins(req, res, next) {
  try {
    const result = await adminsService.listAdmins(req.validatedQuery);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getAdmin(req, res, next) {
  try {
    const admin = await adminsService.getAdminById(Number(req.params.id));
    sendSuccess(res, { admin });
  } catch (error) {
    next(error);
  }
}

export async function createAdmin(req, res, next) {
  try {
    const admin = await adminsService.createAdmin(req.validatedBody);
    sendSuccess(res, { admin, message: 'Administrador creado correctamente' }, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateAdmin(req, res, next) {
  try {
    const admin = await adminsService.updateAdmin(
      Number(req.params.id),
      req.validatedBody,
      req.auth.sub
    );
    sendSuccess(res, { admin, message: 'Administrador actualizado correctamente' });
  } catch (error) {
    next(error);
  }
}

export async function deactivateAdmin(req, res, next) {
  try {
    const result = await adminsService.deactivateAdmin(Number(req.params.id), req.auth.sub);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
