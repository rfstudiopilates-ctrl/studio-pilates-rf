import { pool } from '../../config/database.js';
import { createAppError } from '../../utils/AppError.js';
import {
  addDaysToDate,
  FIXED_SCHEDULE_GRACE_DAYS,
  getFixedScheduleGraceInfo,
  getMonthStartDate,
  getPlanAvailability,
  getPlanEndDate,
  getTodayInArgentina,
  getWeekStartDate,
  toDateString,
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
      'El cliente ya tiene un plan activo. Cancelalo o renovalo antes de asignar uno nuevo.',
      400
    );
  }

  // Si hay plan vencido en gracia con fijos retenidos, liberarlos al asignar otro producto.
  const gracePlan = await plansRepository.findRenewableClientPlan(clientId);
  if (gracePlan && gracePlan.status === 'expired') {
    await reservationsService.releaseFixedSchedulesForClient({
      clientId,
      adminId,
      reason: 'Plan reemplazado: se liberaron los horarios fijos del abono anterior',
      cancelNonRecurringFutures: false,
    });
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

function getDefaultRenewStartDate(previousEndDate, today = getTodayInArgentina()) {
  const end = toDateString(previousEndDate);
  if (!end) {
    return today;
  }

  if (today <= end) {
    return addDaysToDate(end, 1);
  }

  return today;
}

export async function renewClientPlan(clientId, payload, adminId) {
  const client = await clientsRepository.findClientById(clientId);

  if (!client) {
    throw createAppError('Cliente no encontrado', 404);
  }

  await plansRepository.expireClientPlans();

  let previousPlan = null;

  if (payload.clientPlanId) {
    previousPlan = await plansRepository.findClientPlanById(payload.clientPlanId);
    if (!previousPlan || previousPlan.clientId !== clientId) {
      throw createAppError('Asignación de plan no encontrada', 404);
    }
  } else {
    previousPlan = await plansRepository.findRenewableClientPlan(clientId);
  }

  if (!previousPlan) {
    throw createAppError(
      `No hay un plan activo ni uno vencido dentro de los ${FIXED_SCHEDULE_GRACE_DAYS} días de gracia para renovar.`,
      400
    );
  }

  if (previousPlan.status === 'cancelled') {
    throw createAppError('No se puede renovar un plan cancelado. Asigná uno nuevo.', 400);
  }

  if (previousPlan.status === 'expired') {
    const grace = getFixedScheduleGraceInfo(previousPlan.endDate);
    if (!grace.inGrace) {
      throw createAppError(
        `La gracia de ${FIXED_SCHEDULE_GRACE_DAYS} días ya terminó. Asigná un plan nuevo e indicá los horarios fijos otra vez.`,
        400
      );
    }
  }

  const catalogPlan = await plansRepository.findActivePlanById(previousPlan.planId);
  if (!catalogPlan) {
    throw createAppError(
      'El plan del catálogo ya no está activo. Asigná otro plan disponible.',
      404
    );
  }

  const today = getTodayInArgentina();
  const startDate = payload.startDate || getDefaultRenewStartDate(previousPlan.endDate, today);
  const endDate = getPlanEndDate(startDate, {
    weeklyClasses: previousPlan.weeklyClassesLimit,
    monthlyClasses: previousPlan.monthlyClassesLimit,
    durationDays: catalogPlan.durationDays,
  });

  if (previousPlan.status === 'active') {
    await plansRepository.updateClientPlanStatus(previousPlan.id, 'expired');
  }

  const clientPlan = await plansRepository.createClientPlan({
    clientId,
    planId: catalogPlan.id,
    startDate,
    endDate,
    priceSnapshot: catalogPlan.price,
    weeklyClassesLimit: catalogPlan.weeklyClasses,
    monthlyClassesLimit: catalogPlan.monthlyClasses,
    weekResetAt: getWeekStartDate(startDate),
    monthResetAt: getMonthStartDate(startDate),
  });

  const recurringList = await reservationsService.listClientRecurring(clientId);
  let updatedRecurring = 0;

  for (const recurring of recurringList) {
    if (recurring.status !== 'active' && recurring.status !== 'paused') {
      continue;
    }

    await reservationsService.updateRecurringForPlanRenewal(recurring.id, {
      clientPlanId: clientPlan.id,
      endDate,
      startDate: toDateString(recurring.startDate) || startDate,
    });
    updatedRecurring += 1;
  }

  const processing = await reservationsService.processRecurringReservations({ clientId });

  await clientsRepository.createClientHistory({
    clientId,
    actionType: 'client_updated',
    description: `Plan renovado: ${catalogPlan.name}`,
    metadata: {
      previousClientPlanId: previousPlan.id,
      clientPlanId: clientPlan.id,
      planId: catalogPlan.id,
      startDate,
      endDate,
      updatedRecurring,
      processing,
    },
    performedById: adminId,
  });

  const syncedPlan = await syncClientPlanCounters(clientPlan);

  return {
    clientPlan: syncedPlan || {
      ...clientPlan,
      availability: getPlanAvailability(clientPlan),
    },
    previousClientPlanId: previousPlan.id,
    updatedRecurring,
    processing,
    defaultStartDate: getDefaultRenewStartDate(previousPlan.endDate, today),
  };
}

export async function getClientPlans(clientId, query) {
  const client = await clientsRepository.findClientById(clientId);

  if (!client) {
    throw createAppError('Cliente no encontrado', 404);
  }

  await plansRepository.expireClientPlans();
  // Libera fijos de gracia vencida al consultar (además del cron).
  await reservationsService.releaseExpiredPlansPastGrace();

  const activePlan = await plansRepository.findActiveClientPlan(clientId);
  const history = await plansRepository.listClientPlans(clientId, query);
  const syncedActivePlan = activePlan ? await syncClientPlanCounters(activePlan) : null;

  let financials = null;
  if (syncedActivePlan) {
    financials = await financesRepository.getPlanFinancialTotals(syncedActivePlan.id);
  }

  const renewablePlan = syncedActivePlan
    ? syncedActivePlan
    : await plansRepository.findRenewableClientPlan(clientId);

  let syncedGracePlan = null;
  if (!syncedActivePlan && renewablePlan?.status === 'expired') {
    syncedGracePlan = await syncClientPlanCounters(renewablePlan);
  }

  let renewal = null;
  if (renewablePlan) {
    const end = toDateString(renewablePlan.endDate);
    const today = getTodayInArgentina();
    const grace = getFixedScheduleGraceInfo(end, today);
    const isActive = renewablePlan.status === 'active';
    const inGrace = !isActive && grace.inGrace;
    const gracePlan = syncedGracePlan || renewablePlan;

    if (isActive || inGrace) {
      renewal = {
        canRenew: true,
        clientPlanId: renewablePlan.id,
        planId: renewablePlan.planId,
        planName: renewablePlan.planName,
        status: renewablePlan.status,
        startDate: toDateString(renewablePlan.startDate),
        endDate: end,
        priceSnapshot: renewablePlan.priceSnapshot,
        weeklyClassesLimit: renewablePlan.weeklyClassesLimit,
        monthlyClassesLimit: renewablePlan.monthlyClassesLimit,
        defaultRenewStartDate: getDefaultRenewStartDate(end, today),
        graceDaysRemaining: isActive ? null : grace.graceDaysRemaining,
        graceDaysTotal: FIXED_SCHEDULE_GRACE_DAYS,
        graceEndsOn: grace.graceEndsOn,
        inGrace,
        monthlyClassesUsed: inGrace
          ? Number(gracePlan.monthlyClassesUsed || 0)
          : null,
        availability: inGrace
          ? gracePlan.availability || getPlanAvailability(gracePlan)
          : null,
      };
    }
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
    renewal,
    history,
  };
}

export async function getActivePlanForClientRole(clientId) {
  await plansRepository.expireClientPlans();

  const activePlan = await plansRepository.findActiveClientPlan(clientId);

  if (activePlan) {
    const syncedPlan = await syncClientPlanCounters(activePlan);
    return {
      ...syncedPlan,
      availability: getPlanAvailability(syncedPlan),
      inGrace: false,
      graceDaysRemaining: null,
    };
  }

  const gracePlan = await plansRepository.findRenewableClientPlan(clientId);
  if (!gracePlan || gracePlan.status !== 'expired') {
    return null;
  }

  const grace = getFixedScheduleGraceInfo(gracePlan.endDate);
  if (!grace.inGrace) {
    return null;
  }

  const syncedPlan = await syncClientPlanCounters(gracePlan);

  return {
    ...syncedPlan,
    availability: getPlanAvailability(syncedPlan),
    inGrace: true,
    graceDaysRemaining: grace.graceDaysRemaining,
    graceDaysTotal: FIXED_SCHEDULE_GRACE_DAYS,
    graceEndsOn: grace.graceEndsOn,
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

/**
 * Registra cupos de recuperación (catch-up) como ya usados, con motivo.
 * Baja catchUpSlots sin inventar reservas de clases.
 */
export async function consumeCatchUpSlots(clientPlanId, payload, adminId) {
  const clientPlan = await plansRepository.findClientPlanById(clientPlanId);

  if (!clientPlan) {
    throw createAppError('Asignación de plan no encontrada', 404);
  }

  if (clientPlan.status !== 'active') {
    throw createAppError('Solo se pueden ajustar cupos de un plan activo', 400);
  }

  const quantity = Number(payload.quantity);
  const reason = String(payload.reason || '').trim();

  if (!(quantity >= 1)) {
    throw createAppError('Indicá al menos 1 cupo', 400);
  }

  if (reason.length < 3) {
    throw createAppError('Indicá el motivo del ajuste', 400);
  }

  const syncedBefore = await syncClientPlanCounters(clientPlan);
  const catchUpSlots = Number(
    syncedBefore?.availability?.catchUpSlots ?? syncedBefore?.catchUpSlots ?? 0
  );

  if (catchUpSlots <= 0) {
    throw createAppError('Este plan no tiene clases de recuperación disponibles para descontar', 400);
  }

  if (quantity > catchUpSlots) {
    throw createAppError(
      `Solo hay ${catchUpSlots} clase${catchUpSlots === 1 ? '' : 's'} de recuperación. No podés descontar ${quantity}.`,
      400
    );
  }

  const monthlyLimit = Number(clientPlan.monthlyClassesLimit || 0);
  const monthlyUsed = Number(syncedBefore?.monthlyClassesUsed || 0);
  if (monthlyUsed + quantity > monthlyLimit) {
    throw createAppError(
      'El ajuste supera el cupo total del abono. Revisá la cantidad.',
      400
    );
  }

  const adjustment = await plansRepository.createUsageAdjustment({
    clientPlanId: clientPlan.id,
    quantity,
    reason,
    createdByAdminId: adminId,
  });

  const syncedPlan = await syncClientPlanCounters(clientPlan);

  await clientsRepository.createClientHistory({
    clientId: clientPlan.clientId,
    actionType: 'client_updated',
    description: `Cupos de recuperación descontados: ${quantity}. Motivo: ${reason}`,
    metadata: {
      clientPlanId: clientPlan.id,
      quantity,
      reason,
      adjustmentId: adjustment.id,
      catchUpBefore: catchUpSlots,
      catchUpAfter: syncedPlan?.availability?.catchUpSlots ?? syncedPlan?.catchUpSlots ?? 0,
      monthlyClassesUsed: syncedPlan?.monthlyClassesUsed,
    },
    performedById: adminId,
  });

  return {
    message:
      quantity === 1
        ? 'Se descontó 1 clase de recuperación del cupo.'
        : `Se descontaron ${quantity} clases de recuperación del cupo.`,
    adjustment,
    clientPlan: syncedPlan,
  };
}

export { getPlanAvailability };
