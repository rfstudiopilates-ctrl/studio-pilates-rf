import { pool } from '../../config/database.js';
import { createAppError } from '../../utils/AppError.js';
import {
  getMonthStartDate,
  getPlanAvailability,
  getPlanEndDate,
  getTodayInArgentina,
  getWeekStartDate,
} from '../../utils/dates.js';
import * as plansRepository from './plans.repository.js';
import { syncClientPlanCounters } from './plans.usage.js';
import * as clientsRepository from '../clients/clients.repository.js';
import * as financesRepository from '../finances/finances.repository.js';
import * as financesService from '../finances/finances.service.js';
import * as reservationsService from '../reservations/reservations.service.js';
import {
  notifyPlanCancelled,
  runNotificationSafely,
} from '../notifications/notifications.dispatcher.js';

export async function listPlans(query) {
  return plansRepository.listPlans(query);
}

export async function getPlanById(id) {
  const plan = await plansRepository.findPlanById(id);

  if (!plan) {
    throw createAppError('Plan no encontrado', 404);
  }

  return plan;
}

export async function createPlan(payload) {
  return plansRepository.createPlan(payload);
}

export async function updatePlan(id, payload) {
  const plan = await plansRepository.findPlanById(id);

  if (!plan) {
    throw createAppError('Plan no encontrado', 404);
  }

  if (payload.status === 'inactive') {
    const activeAssignments = await plansRepository.countActiveClientPlansByPlanId(id);

    if (activeAssignments > 0) {
      throw createAppError(
        'No podés desactivar un plan con asignaciones activas',
        400
      );
    }
  }

  return plansRepository.updatePlan(id, payload);
}

export async function deletePlan(id) {
  const plan = await plansRepository.findPlanById(id);

  if (!plan) {
    throw createAppError('Plan no encontrado', 404);
  }

  const linkedAssignments = await plansRepository.countClientPlansByPlanId(id);

  if (linkedAssignments === 0) {
    await plansRepository.hardDeletePlan(id);
    return {
      action: 'deleted',
      plan: { ...plan },
      message: 'Plan eliminado correctamente',
    };
  }

  if (plan.status === 'inactive') {
    return {
      action: 'deactivated',
      plan,
      message: 'El plan ya está inactivo porque tiene historial vinculado',
    };
  }

  const inactivePlan = await plansRepository.updatePlan(id, { status: 'inactive' });

  return {
    action: 'deactivated',
    plan: inactivePlan,
    message: 'Plan desactivado porque tiene historial vinculado',
  };
}

export async function assignPlanToClient(clientId, payload, adminId) {
  const client = await clientsRepository.findClientById(clientId);

  if (!client) {
    throw createAppError('Cliente no encontrado', 404);
  }

  const plan = await plansRepository.findActivePlanById(payload.planId);

  if (!plan) {
    throw createAppError('Plan no encontrado o inactivo', 404);
  }

  await plansRepository.expireClientPlans();

  const existingActivePlan = await plansRepository.findActiveClientPlan(clientId);

  if (existingActivePlan) {
    throw createAppError(
      'El cliente ya tiene un plan activo. Cancelalo antes de asignar uno nuevo.',
      400
    );
  }

  const startDate = payload.startDate || getTodayInArgentina();
  const endDate = getPlanEndDate(startDate, plan);

  const clientPlan = await plansRepository.createClientPlan({
    clientId,
    planId: plan.id,
    startDate,
    endDate,
    priceSnapshot: plan.price,
    weeklyClassesLimit: plan.weeklyClasses,
    monthlyClassesLimit: plan.monthlyClasses,
    weekResetAt: getWeekStartDate(startDate),
    monthResetAt: getMonthStartDate(startDate),
  });

  await clientsRepository.createClientHistory({
    clientId,
    actionType: 'client_updated',
    description: `Plan asignado: ${plan.name}`,
    metadata: {
      planId: plan.id,
      clientPlanId: clientPlan.id,
      startDate,
      endDate,
      price: plan.price,
    },
    performedById: adminId,
  });

  const syncedPlan = await syncClientPlanCounters(clientPlan);

  return {
    clientPlan: syncedPlan || {
      ...clientPlan,
      availability: getPlanAvailability(clientPlan),
    },
  };
}

export async function getClientPlans(clientId, query) {
  const client = await clientsRepository.findClientById(clientId);

  if (!client) {
    throw createAppError('Cliente no encontrado', 404);
  }

  await plansRepository.expireClientPlans();

  const activePlan = await plansRepository.findActiveClientPlan(clientId);
  const history = await plansRepository.listClientPlans(clientId, query);
  const syncedActivePlan = activePlan ? await syncClientPlanCounters(activePlan) : null;

  let financials = null;
  if (syncedActivePlan) {
    financials = await financesRepository.getPlanFinancialTotals(syncedActivePlan.id);
  }

  return {
    activePlan: syncedActivePlan
      ? {
          ...syncedActivePlan,
          availability:
            syncedActivePlan.availability || getPlanAvailability(syncedActivePlan),
          financials,
        }
      : null,
    history,
  };
}

export async function getActivePlanForClientRole(clientId) {
  await plansRepository.expireClientPlans();

  const activePlan = await plansRepository.findActiveClientPlan(clientId);

  if (!activePlan) {
    return null;
  }

  const syncedPlan = await syncClientPlanCounters(activePlan);

  return {
    ...syncedPlan,
    availability: getPlanAvailability(syncedPlan),
  };
}

export async function cancelClientPlan(clientPlanId, adminId, payload = {}) {
  const clientPlan = await plansRepository.findClientPlanById(clientPlanId);

  if (!clientPlan) {
    throw createAppError('Asignación de plan no encontrada', 404);
  }

  if (clientPlan.status !== 'active') {
    throw createAppError('Solo se pueden cancelar planes activos', 400);
  }

  const withRefund = Boolean(payload.withRefund);
  const refundAmount = Number(payload.refundAmount || 0);
  const paymentMethod = payload.paymentMethod || null;
  const notes = payload.notes?.trim() || null;

  const financials = await financesRepository.getPlanFinancialTotals(clientPlan.id);
  let refundResult = null;

  if (withRefund) {
    if (financials.refundMode === 'none') {
      throw createAppError(
        'Este plan no tiene pagos ni deuda registrada para devolver o condonar.',
        400
      );
    }

    const maxAmount =
      financials.refundMode === 'cash' ? financials.maxCashRefund : financials.maxForgive;

    if (!(refundAmount > 0)) {
      throw createAppError('Indicá un monto de devolución mayor a 0.', 400);
    }

    if (refundAmount > maxAmount + 0.001) {
      throw createAppError(
        `El monto máximo ${financials.refundMode === 'cash' ? 'a devolver' : 'a condonar'} es ${maxAmount}.`,
        400
      );
    }

    if (financials.refundMode === 'cash' && !paymentMethod) {
      throw createAppError('Seleccioná el método con el que se hace la devolución.', 400);
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await plansRepository.cancelActiveClientPlans(clientPlan.clientId, connection);

      refundResult = await financesService.createPlanRefundMovements({
        clientId: clientPlan.clientId,
        amount: Number(refundAmount.toFixed(2)),
        planLabel: clientPlan.planName,
        paymentMethod,
        referenceId: clientPlan.id,
        adminId,
        mode: financials.refundMode,
        connection,
      });

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await financesService.syncClientFinancialStatus(clientPlan.clientId);
  } else {
    await plansRepository.cancelActiveClientPlans(clientPlan.clientId);
  }

  const bookingCleanup = await reservationsService.releaseBookingsAfterPlanCancel({
    clientId: clientPlan.clientId,
    adminId,
  });

  const refundLabel = withRefund
    ? financials.refundMode === 'cash'
      ? `con devolución de ${refundAmount}`
      : `con condonación de ${refundAmount}`
    : 'sin devolución';

  await clientsRepository.createClientHistory({
    clientId: clientPlan.clientId,
    actionType: 'client_updated',
    description: `Plan cancelado (${refundLabel}): ${clientPlan.planName}`,
    metadata: {
      clientPlanId: clientPlan.id,
      withRefund,
      refundAmount: withRefund ? refundAmount : 0,
      refundMode: withRefund ? financials.refundMode : 'none',
      paymentMethod,
      notes,
      refundResult,
      bookingCleanup,
    },
    performedById: adminId,
  });

  runNotificationSafely(
    notifyPlanCancelled({
      clientId: clientPlan.clientId,
      planName: clientPlan.planName,
    })
  );

  return {
    message: withRefund
      ? financials.refundMode === 'cash'
        ? 'Plan cancelado y devolución registrada en finanzas.'
        : 'Plan cancelado y deuda condonada en finanzas.'
      : 'Plan cancelado correctamente.',
    withRefund,
    refundAmount: withRefund ? refundAmount : 0,
    refundMode: withRefund ? financials.refundMode : 'none',
    bookingCleanup,
  };
}

export { getPlanAvailability };
