import * as plansService from './plans.service.js';

function sendSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json({ success: true, data });
}

export async function listPlans(req, res, next) {
  try {
    const result = await plansService.listPlans(req.validatedQuery);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getPlan(req, res, next) {
  try {
    const plan = await plansService.getPlanById(Number(req.params.id));
    sendSuccess(res, { plan });
  } catch (error) {
    next(error);
  }
}

export async function createPlan(req, res, next) {
  try {
    const plan = await plansService.createPlan(req.validatedBody);
    sendSuccess(res, { plan, message: 'Plan creado correctamente' }, 201);
  } catch (error) {
    next(error);
  }
}

export async function updatePlan(req, res, next) {
  try {
    const plan = await plansService.updatePlan(Number(req.params.id), req.validatedBody);
    sendSuccess(res, { plan, message: 'Plan actualizado correctamente' });
  } catch (error) {
    next(error);
  }
}

export async function deletePlan(req, res, next) {
  try {
    const result = await plansService.deletePlan(Number(req.params.id));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function assignPlan(req, res, next) {
  try {
    const result = await plansService.assignPlanToClient(
      Number(req.params.clientId),
      req.validatedBody,
      req.auth.sub
    );
    sendSuccess(res, { ...result, message: 'Plan asignado correctamente' }, 201);
  } catch (error) {
    next(error);
  }
}

export async function getClientPlans(req, res, next) {
  try {
    const result = await plansService.getClientPlans(
      Number(req.params.clientId),
      req.validatedQuery
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function cancelClientPlan(req, res, next) {
  try {
    const result = await plansService.cancelClientPlan(
      Number(req.params.id),
      req.auth.sub,
      req.validatedBody || {}
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
