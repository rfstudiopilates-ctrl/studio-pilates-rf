import * as financesService from './finances.service.js';

function sendSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json({ success: true, data });
}

export async function getClientFinances(req, res, next) {
  try {
    const result = await financesService.getClientFinances(
      Number(req.params.clientId),
      req.validatedQuery
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createMovement(req, res, next) {
  try {
    const movement = await financesService.createMovement(
      Number(req.params.clientId),
      req.validatedBody,
      req.auth.sub
    );
    sendSuccess(res, { movement, message: 'Movimiento registrado correctamente' }, 201);
  } catch (error) {
    next(error);
  }
}

export async function settlePlanAssignment(req, res, next) {
  try {
    const result = await financesService.settlePlanAssignment(
      Number(req.params.clientId),
      req.validatedBody,
      req.auth.sub
    );
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function listAllMovements(req, res, next) {
  try {
    const result = await financesService.listAllMovements(req.validatedQuery);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getFinanceOverview(req, res, next) {
  try {
    const result = await financesService.getFinanceOverview(req.validatedQuery);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getMyAccount(req, res, next) {
  try {
    const result = await financesService.getClientAccountForClientRole(req.auth.sub);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
