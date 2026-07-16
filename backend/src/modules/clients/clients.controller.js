import * as clientsService from './clients.service.js';

function sendSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json({ success: true, data });
}

export async function listClients(req, res, next) {
  try {
    const result = await clientsService.listClients(req.validatedQuery);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getClient(req, res, next) {
  try {
    const result = await clientsService.getClientWithHistory(
      Number(req.params.id),
      req.validatedQuery
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createClient(req, res, next) {
  try {
    const client = await clientsService.createClient(req.validatedBody, req.auth.sub);
    sendSuccess(res, { client, message: 'Cliente creado correctamente' }, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateClient(req, res, next) {
  try {
    const client = await clientsService.updateClient(
      Number(req.params.id),
      req.validatedBody,
      req.auth.sub
    );
    sendSuccess(res, { client, message: 'Cliente actualizado correctamente' });
  } catch (error) {
    next(error);
  }
}

export async function deleteClient(req, res, next) {
  try {
    const result = await clientsService.deleteClient(Number(req.params.id), req.auth.sub);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
