import { pool } from '../../config/database.js';
import { env } from '../../config/env.js';
import { createAppError } from '../../utils/AppError.js';
import {
  addDaysToDate,
  canCancelClass,
  getHoursUntilClass,
  getMonthStartDate,
  getPlanEndDate,
  getTodayInArgentina,
  getWeekStartDate,
  normalizeTime,
  toDateString,
} from '../../utils/dates.js';
import { getSettings } from '../settings/settings.repository.js';
import * as clientsRepository from '../clients/clients.repository.js';
import * as plansRepository from '../plans/plans.repository.js';
import * as classesRepository from '../classes/classes.repository.js';
import { generateClasses } from '../classes/classes.generation.js';
import * as financesRepository from '../finances/finances.repository.js';
import {
  createPlanDebtMovement,
  createPlanPaymentMovement,
  syncClientFinancialStatus,
} from '../finances/finances.service.js';
import { PAYMENT_METHOD_LABELS } from '../finances/finances.constants.js';
import * as reservationsRepository from './reservations.repository.js';
import { ACTIVE_RESERVATION_STATUSES } from './reservations.constants.js';
import {
  getFixedScheduleSlotLimit,
  planAllowsFixedSchedules,
} from './recurring.eligibility.js';
import {
  notifyNewReservation,
  notifyPendingReservation,
  notifyReservationApproved,
  notifyReservationCancelled,
  runNotificationSafely,
} from '../notifications/notifications.dispatcher.js';
import {
  decrementClientPlanUsage,
  getAvailabilityForClassDate,
  incrementClientPlanUsage,
  syncClientPlanCounters,
} from '../plans/plans.usage.js';

function formatDebtLabel(amount) {
  return Number(amount).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

async function validateClientCanBook(clientId, { allowDebt = false, client = null } = {}) {
  const resolved = client || (await clientsRepository.findClientById(clientId));

  if (!resolved) {
    throw createAppError('Cliente no encontrado', 404);
  }

  if (resolved.deletedAt) {
    throw createAppError('La cuenta del cliente está desactivada', 400);
  }

  if (resolved.status === 'suspended') {
    throw createAppError('Tu cuenta está suspendida. Contactá al estudio.', 403);
  }

  if (!allowDebt) {
    const settings = await getSettings();
    if (settings.blockBookingOnDebt !== false) {
      const balance = await financesRepository.getLatestBalance(clientId);
      const debtAmount = Math.max(0, Number((-Number(balance)).toFixed(2)));
      const threshold = Math.max(0, Number(settings.debtBookingBlockAmount ?? 0));

      // threshold 0 = cualquier deuda bloquea; si > 0, bloquea desde ese monto (inclusive).
      if (debtAmount > 0 && debtAmount >= threshold) {
        const debtLabel = formatDebtLabel(debtAmount);
        const thresholdLabel = formatDebtLabel(threshold);
        const detail =
          threshold > 0
            ? ` Tu deuda actual es de ${debtLabel} (el estudio bloquea a partir de ${thresholdLabel}).`
            : ` Tu deuda actual es de ${debtLabel}.`;

        throw createAppError(
          `Tenés una deuda pendiente que impide reservar.${detail} Regularizá el pago o pedí ayuda al estudio.`,
          403
        );
      }
    }
  }

  return resolved;
}

function getPendingHoldAgeHours(createdAt) {
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) {
    return 0;
  }
  return (Date.now() - createdMs) / (1000 * 60 * 60);
}

function isPendingHoldExpired(reservation, holdHours) {
  if (reservation.status !== 'pending' || reservation.bookingType !== 'drop_in') {
    return false;
  }

  if (getHoursUntilClass(reservation.classDate, reservation.startTime) <= 0) {
    return true;
  }

  return getPendingHoldAgeHours(reservation.createdAt) >= holdHours;
}

/**
 * Libera cupos de solicitudes drop-in pending vencidas (TTL o clase ya iniciada).
 * Idempotente y segura para correr en cron / antes de reservar.
 */
export async function expireStalePendingReservations({ source = 'manual' } = {}) {
  const settings = await getSettings();
  const holdHours = Number(settings.pendingHoldHours) > 0 ? Number(settings.pendingHoldHours) : 24;
  const pending = await reservationsRepository.listPendingDropInReservations();

  let expired = 0;

  for (const reservation of pending) {
    if (!isPendingHoldExpired(reservation, holdHours)) {
      continue;
    }

    try {
      await cancelReservation({
        reservationId: reservation.id,
        cancelledBy: 'admin',
        cancellationReason:
          getHoursUntilClass(reservation.classDate, reservation.startTime) <= 0
            ? 'Solicitud liberada: la clase ya comenzó sin confirmación'
            : `Solicitud liberada automáticamente tras ${holdHours}h sin confirmación`,
        silent: true,
      });
      expired += 1;
    } catch {
      // Otra corrida pudo cancelarla; continuar.
    }
  }

  if (expired > 0 || source === 'cron' || source === 'startup') {
    console.log(`[JOB] Holds pending expirados (${source}): ${expired}`);
  }

  return { expired, checked: pending.length, holdHours };
}

async function validateClassForBooking(
  generatedClassId,
  connection,
  { alreadyHoldingSeat = false } = {}
) {
  const classItem = await classesRepository.getClassByIdForUpdate(generatedClassId, connection);

  if (!classItem) {
    throw createAppError('Clase no encontrada', 404);
  }

  if (classItem.status !== 'scheduled') {
    throw createAppError('La clase no está disponible para reservas', 400);
  }

  if (getHoursUntilClass(classItem.classDate, classItem.startTime) <= 0) {
    throw createAppError('No podés reservar una clase que ya comenzó o finalizó', 400);
  }

  if (!alreadyHoldingSeat && classItem.bookedCount >= classItem.capacity) {
    throw createAppError('La clase no tiene cupos disponibles', 400);
  }

  return classItem;
}

function isDropInReservation(reservation) {
  return reservation?.bookingType === 'drop_in';
}

export async function createReservation({
  clientId,
  generatedClassId,
  recoveryCreditId,
  status = 'confirmed',
  bookingType = 'standard',
  notes,
  createdByAdminId,
  recurringReservationId,
  skipPlanCheck = false,
}) {
  await expireStalePendingReservations({ source: 'booking' });
  await plansRepository.expireClientPlans();

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const lockedClient = await clientsRepository.lockClientById(clientId, connection);
    if (!lockedClient) {
      throw createAppError('Cliente no encontrado', 404);
    }

    await validateClientCanBook(clientId, {
      allowDebt: Boolean(createdByAdminId),
      client: lockedClient,
    });

    const existing = await reservationsRepository.findReservationByClientAndClass(
      clientId,
      generatedClassId,
      connection
    );

    if (existing && ACTIVE_RESERVATION_STATUSES.includes(existing.status)) {
      throw createAppError('Ya tenés una reserva activa para esta clase', 400);
    }

    const classItem = await validateClassForBooking(generatedClassId, connection);

    const sameDayReservation = await reservationsRepository.findActiveReservationByClientAndDate(
      clientId,
      classItem.classDate,
      connection
    );

    if (sameDayReservation) {
      throw createAppError(
        'Ya tenés una clase reservada para ese día. Cancelala primero si querés cambiar de horario.',
        400
      );
    }

    let clientPlanId = null;
    let consumesPlan = false;
    let finalBookingType = bookingType;
    let finalStatus = status;

    if (recoveryCreditId) {
      const credit = await reservationsRepository.findRecoveryCreditByIdForUpdate(
        recoveryCreditId,
        connection
      );

      if (!credit || credit.clientId !== clientId) {
        throw createAppError('Crédito de recuperación no válido', 400);
      }

      if (credit.status !== 'available') {
        throw createAppError('El crédito de recuperación no está disponible', 400);
      }

      if (credit.expiresAt < getTodayInArgentina()) {
        throw createAppError('El crédito de recuperación expiró', 400);
      }

      finalBookingType = 'recovery';
      consumesPlan = false;
    } else if (!skipPlanCheck) {
      let activePlan = await plansRepository.findActiveClientPlanForUpdate(clientId, connection);

      if (!activePlan) {
        throw createAppError('Necesitás un plan activo para reservar', 400);
      }

      activePlan = await syncClientPlanCounters(activePlan, connection);
      const availability = await getAvailabilityForClassDate(
        activePlan,
        classItem.classDate,
        connection
      );

      if (!availability.canBook) {
        if (availability.monthlyRemaining <= 0) {
          throw createAppError('Ya usaste todas las clases de tu abono', 400);
        }

        throw createAppError(
          'Ya alcanzaste el cupo de esta semana. Si te quedan clases del abono, cancelá a tiempo una reserva para recuperar cupo o esperá a la próxima semana.',
          400
        );
      }

      clientPlanId = activePlan.id;
      consumesPlan = true;
    }

    if (finalStatus === 'pending') {
      consumesPlan = false;
    }

    let reservation;

    if (existing) {
      // Reutilizar la fila (p. ej. tras pausar un fijo) por el UNIQUE cliente+clase.
      reservation = await reservationsRepository.updateReservation(
        existing.id,
        {
          status: finalStatus,
          clientPlanId,
          recoveryCreditId: recoveryCreditId || null,
          recurringReservationId: recurringReservationId || null,
          bookingType: finalBookingType,
          consumesPlan,
          notes: notes ?? existing.notes,
          cancelledAt: null,
          cancelledBy: null,
          cancellationReason: null,
        },
        connection
      );
    } else {
      reservation = await reservationsRepository.createReservation(
        {
          clientId,
          generatedClassId,
          clientPlanId,
          recoveryCreditId: recoveryCreditId || null,
          recurringReservationId: recurringReservationId || null,
          status: finalStatus,
          bookingType: finalBookingType,
          consumesPlan,
          notes,
          createdByAdminId,
        },
        connection
      );
    }

    // pending y confirmed ocupan cupo (pending = hold hasta aprobar/rechazar).
    if (ACTIVE_RESERVATION_STATUSES.includes(finalStatus)) {
      await classesRepository.adjustBookedCount(generatedClassId, 1, connection);
    }

    if (finalStatus === 'confirmed') {
      if (consumesPlan && clientPlanId) {
        const usageResult = await incrementClientPlanUsage(clientPlanId, connection);
        if (!usageResult?.ok) {
          throw createAppError(usageResult.reason, 400);
        }
      }

      if (recoveryCreditId) {
        await reservationsRepository.markRecoveryCreditUsed(
          recoveryCreditId,
          reservation.id,
          connection
        );
      }
    }

    await connection.commit();

    if (finalStatus === 'confirmed') {
      runNotificationSafely(
        notifyNewReservation({
          reservation,
          clientName: reservation.clientName,
        })
      );
    } else if (finalStatus === 'pending') {
      runNotificationSafely(
        notifyPendingReservation({
          reservation,
          clientName: reservation.clientName,
        })
      );
    }

    return reservation;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function confirmReservation(reservationId, adminId, payload = {}) {
  await expireStalePendingReservations({ source: 'confirm' });

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const reservation = await reservationsRepository.findReservationByIdForUpdate(
      reservationId,
      connection
    );

    if (!reservation) {
      throw createAppError('Reserva no encontrada', 404);
    }

    if (reservation.status !== 'pending') {
      throw createAppError('Solo se pueden confirmar reservas pendientes', 400);
    }

    await clientsRepository.lockClientById(reservation.clientId, connection);

    const settings = await getSettings();
    const holdHours = Number(settings.pendingHoldHours) > 0 ? Number(settings.pendingHoldHours) : 24;
    if (isPendingHoldExpired(reservation, holdHours)) {
      throw createAppError(
        'Esta solicitud ya expiró y el cupo fue liberado. Pedile al cliente que vuelva a solicitarla.',
        400
      );
    }

    const dropIn = isDropInReservation(reservation);
    const classItem = await validateClassForBooking(reservation.generatedClassId, connection, {
      alreadyHoldingSeat: true,
    });

    let clientPlanId = reservation.clientPlanId;
    let consumesPlan = Boolean(reservation.consumesPlan);
    let depositMovement = null;
    let debtMovement = null;
    let assignedClientPlan = null;

    if (dropIn) {
      const depositAmount = Number(payload.depositAmount ?? 0);
      const paymentMethod = payload.paymentMethod;

      if (Number.isNaN(depositAmount) || depositAmount < 0) {
        throw createAppError('El monto de la seña no es válido', 400);
      }

      if (depositAmount > 0 && !paymentMethod) {
        throw createAppError('Seleccioná cómo pagó la seña', 400);
      }

      const studioSettings = await getSettings();
      const dropInPlanId = studioSettings?.dropInPlanId;

      if (!dropInPlanId) {
        throw createAppError(
          'No hay un plan configurado para clases puntuales. Definilo en Configuración → Operación.',
          400
        );
      }

      const plan = await plansRepository.findActivePlanById(dropInPlanId);

      if (!plan) {
        throw createAppError(
          'El plan de clase puntual configurado no existe o está inactivo. Revisá Configuración.',
          400
        );
      }

      await plansRepository.expireClientPlans();
      const existingActivePlan = await plansRepository.findActiveClientPlan(
        reservation.clientId,
        connection
      );

      if (existingActivePlan) {
        throw createAppError(
          'El cliente ya tiene un plan activo. Cancelalo antes de confirmar esta solicitud puntual.',
          400
        );
      }

      const startDate = classItem.classDate || getTodayInArgentina();
      const endDate = getPlanEndDate(startDate, plan);
      const planPrice = Number(plan.price || 0);

      assignedClientPlan = await plansRepository.createClientPlan(
        {
          clientId: reservation.clientId,
          planId: plan.id,
          startDate,
          endDate,
          priceSnapshot: planPrice,
          weeklyClassesLimit: plan.weeklyClasses,
          monthlyClassesLimit: plan.monthlyClasses,
          weekResetAt: getWeekStartDate(startDate),
          monthResetAt: getMonthStartDate(startDate),
        },
        connection
      );

      if (planPrice > 0) {
        debtMovement = await createPlanDebtMovement({
          clientId: reservation.clientId,
          amount: planPrice,
          description: `Asignación de plan: ${plan.name} (clase puntual ${classItem.classDate} ${classItem.startTime})`,
          referenceId: assignedClientPlan.id,
          adminId,
          connection,
        });
      }

      if (depositAmount > 0) {
        const methodLabel = PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod;
        depositMovement = await createPlanPaymentMovement({
          clientId: reservation.clientId,
          amount: depositAmount,
          description:
            payload.notes?.trim() ||
            `Seña / pago plan ${plan.name} (${methodLabel}) · ${classItem.classDate} ${classItem.startTime}`,
          paymentMethod,
          referenceId: assignedClientPlan.id,
          adminId,
          connection,
        });
      }

      clientPlanId = assignedClientPlan.id;
      consumesPlan = true;
    } else if (reservation.bookingType !== 'recovery') {
      await plansRepository.expireClientPlans();
      let activePlan = await plansRepository.findActiveClientPlan(reservation.clientId);

      if (!activePlan) {
        throw createAppError('El cliente no tiene un plan activo', 400);
      }

      activePlan = await syncClientPlanCounters(activePlan, connection);
      const availability = await getAvailabilityForClassDate(
        activePlan,
        classItem.classDate,
        connection
      );

      if (!availability.canBook) {
        if (availability.monthlyRemaining <= 0) {
          throw createAppError('El cliente ya usó todas las clases del abono', 400);
        }

        throw createAppError(
          'El cliente alcanzó el cupo de esa semana. Todavía puede recuperar clases cancelando a tiempo o usando el catch-up del abono en otra fecha.',
          400
        );
      }

      clientPlanId = activePlan.id;
      consumesPlan = true;
    }

    // El cupo ya se reservó al crear la solicitud pending.
    const updated = await reservationsRepository.updateReservation(
      reservationId,
      {
        status: 'confirmed',
        clientPlanId,
        consumesPlan,
        notes: payload.notes?.trim()
          ? [reservation.notes, payload.notes.trim()].filter(Boolean).join(' · ')
          : reservation.notes,
      },
      connection
    );

    if (consumesPlan && clientPlanId) {
      const usageResult = await incrementClientPlanUsage(clientPlanId, connection);
      if (!usageResult?.ok) {
        throw createAppError(usageResult.reason || 'No se pudo actualizar el uso del plan', 400);
      }
    }

    await clientsRepository.createClientHistory({
      clientId: reservation.clientId,
      actionType: 'client_updated',
      description: dropIn
        ? `Clase puntual confirmada: ${classItem.classDate} ${classItem.startTime}${
            assignedClientPlan ? ` · plan ${assignedClientPlan.planName}` : ''
          }`
        : `Reserva confirmada: ${classItem.classDate} ${classItem.startTime}`,
      metadata: {
        reservationId,
        classId: classItem.id,
        depositMovementId: depositMovement?.id || null,
        debtMovementId: debtMovement?.id || null,
        clientPlanId: clientPlanId || null,
        bookingType: reservation.bookingType,
      },
      performedById: adminId,
      connection,
    });

    if (dropIn && assignedClientPlan) {
      await clientsRepository.createClientHistory({
        clientId: reservation.clientId,
        actionType: 'client_updated',
        description: `Plan asignado: ${assignedClientPlan.planName}`,
        metadata: {
          planId: assignedClientPlan.planId,
          clientPlanId: assignedClientPlan.id,
          source: 'drop_in',
          reservationId,
        },
        performedById: adminId,
        connection,
      });
    }

    await connection.commit();

    let balanceAfter = null;

    if (dropIn) {
      await syncClientFinancialStatus(reservation.clientId);
      balanceAfter = await financesRepository.getLatestBalance(reservation.clientId);
    }

    runNotificationSafely(
      notifyReservationApproved({
        reservation: updated,
        clientId: updated.clientId,
      })
    );

    return {
      reservation: updated,
      clientPlan: assignedClientPlan,
      debtMovement,
      depositMovement,
      balanceAfter,
      planPrice: assignedClientPlan ? Number(assignedClientPlan.priceSnapshot) : null,
      depositAmount: dropIn ? Number(payload.depositAmount ?? 0) : null,
      remainingBalance: balanceAfter,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function cancelReservation({
  reservationId,
  cancelledBy,
  cancellationReason,
  adminId,
  clientId = null,
  silent = false,
  skipRecoveryCredit = false,
}) {
  const settings = await getSettings();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const reservation = await reservationsRepository.findReservationByIdForUpdate(
      reservationId,
      connection
    );

    if (!reservation) {
      throw createAppError('Reserva no encontrada', 404);
    }

    // Clientes solo pueden cancelar sus propias reservas (evita IDOR por ID).
    if (cancelledBy === 'client') {
      if (clientId == null || Number(reservation.clientId) !== Number(clientId)) {
        throw createAppError('Reserva no encontrada', 404);
      }
    }

    if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) {
      throw createAppError('La reserva ya no está activa', 400);
    }

    await clientsRepository.lockClientById(reservation.clientId, connection);

    const classItem = await classesRepository.getClassByIdForUpdate(
      reservation.generatedClassId,
      connection
    );

    if (!classItem) {
      throw createAppError('Clase no encontrada', 404);
    }

    const isDropInPending =
      reservation.status === 'pending' && reservation.bookingType === 'drop_in';

    if (
      cancelledBy === 'client' &&
      !isDropInPending &&
      !canCancelClass(classItem.classDate, classItem.startTime, settings.cancellationHours)
    ) {
      throw createAppError(
        `Solo podés cancelar con al menos ${settings.cancellationHours} horas de anticipación`,
        400
      );
    }

    const wasConfirmed = reservation.status === 'confirmed';
    const wasHoldingSeat = ACTIVE_RESERVATION_STATUSES.includes(reservation.status);
    const timelyCancel =
      isDropInPending ||
      canCancelClass(classItem.classDate, classItem.startTime, settings.cancellationHours);

    // Cancelación tardía (solo admin llega acá): la clase se pierde del cupo (no_show).
    // Cancelación a tiempo: status cancelled → el cupo vuelve al abono para catch-up.
    const nextStatus =
      wasConfirmed && !timelyCancel && reservation.consumesPlan ? 'no_show' : 'cancelled';

    const updated = await reservationsRepository.updateReservation(
      reservationId,
      {
        status: nextStatus,
        cancelledAt: new Date(),
        cancelledBy,
        cancellationReason:
          cancellationReason ||
          (nextStatus === 'no_show' ? 'Cancelación fuera de plazo' : null),
      },
      connection
    );

    if (wasHoldingSeat) {
      await classesRepository.adjustBookedCount(reservation.generatedClassId, -1, connection);

      if (wasConfirmed && reservation.consumesPlan && reservation.clientPlanId) {
        await plansRepository.findClientPlanByIdForUpdate(reservation.clientPlanId, connection);
        await decrementClientPlanUsage(reservation.clientPlanId, connection);
      }
    }

    const returnedToPlan =
      nextStatus === 'cancelled' &&
      wasConfirmed &&
      Boolean(reservation.consumesPlan) &&
      timelyCancel &&
      !skipRecoveryCredit;

    await clientsRepository.createClientHistory({
      clientId: reservation.clientId,
      actionType: 'client_updated',
      description:
        nextStatus === 'no_show'
          ? `Reserva marcada como ausente (fuera de plazo): ${classItem.classDate} ${classItem.startTime}`
          : `Reserva cancelada: ${classItem.classDate} ${classItem.startTime}`,
      metadata: {
        reservationId,
        cancelledBy,
        status: nextStatus,
        returnedToPlan,
        timelyCancel,
      },
      performedByType: cancelledBy === 'client' ? 'client' : adminId ? 'admin' : 'system',
      performedById: adminId || (cancelledBy === 'client' ? Number(clientId) : null),
      connection,
    });

    await connection.commit();

    if (!silent && nextStatus === 'cancelled') {
      runNotificationSafely(
        notifyReservationCancelled({
          reservation: updated,
          clientId: reservation.clientId,
          clientName: reservation.clientName,
          cancelledBy,
        })
      );
    }

    return {
      reservation: updated,
      recoveryCredit: null,
      returnedToPlan,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function completePastActiveReservations({ clientId = null } = {}) {
  const today = getTodayInArgentina();

  const pastActives = await reservationsRepository.listActivePastReservations({
    beforeDate: today,
    clientId,
  });

  let cancelledPending = 0;

  for (const reservation of pastActives) {
    if (reservation.status !== 'pending') {
      continue;
    }

    try {
      await cancelReservation({
        reservationId: reservation.id,
        cancelledBy: 'system',
        cancellationReason: 'Clase vencida sin confirmar',
        silent: true,
        skipRecoveryCredit: true,
      });
      cancelledPending += 1;
    } catch {
      // Puede haber sido cancelada en paralelo.
    }
  }

  const completedConfirmed = await reservationsRepository.markPastConfirmedAsCompleted({
    beforeDate: today,
    clientId,
  });

  return { cancelledPending, completedConfirmed };
}

/**
 * Al cancelar un plan: cierra horarios fijos y libera reservas futuras.
 * Las confirmadas ya pasadas se marcan completed (no deben seguir como "activas").
 */
export async function releaseBookingsAfterPlanCancel({ clientId, adminId }) {
  const today = getTodayInArgentina();
  const pastCleanup = await completePastActiveReservations({ clientId });

  const recurringList = await reservationsRepository.listRecurringByClient(clientId);
  let cancelledRecurring = 0;
  let cancelledReservations = 0;

  for (const recurring of recurringList) {
    if (recurring.status !== 'active' && recurring.status !== 'paused') {
      continue;
    }

    await reservationsRepository.updateRecurringReservation(recurring.id, {
      status: 'cancelled',
      endDate: today,
    });
    cancelledRecurring += 1;

    const futureFromRecurring =
      await reservationsRepository.listActiveFutureReservationsByRecurring(recurring.id, today);

    for (const reservation of futureFromRecurring) {
      try {
        await cancelReservation({
          reservationId: reservation.id,
          cancelledBy: 'admin',
          cancellationReason: 'Plan cancelado',
          adminId,
          silent: true,
          skipRecoveryCredit: true,
        });
        cancelledReservations += 1;
      } catch {
        // Continuar.
      }
    }
  }

  const remainingActives =
    await reservationsRepository.listActiveReservationsByClient(clientId);

  for (const reservation of remainingActives) {
    const classDate = toDateString(reservation.classDate) || String(reservation.classDate || '');

    if (!classDate || classDate < today) {
      continue;
    }

    try {
      await cancelReservation({
        reservationId: reservation.id,
        cancelledBy: 'admin',
        cancellationReason: 'Plan cancelado',
        adminId,
        silent: true,
        skipRecoveryCredit: true,
      });
      cancelledReservations += 1;
    } catch {
      // Continuar.
    }
  }

  return {
    ...pastCleanup,
    cancelledRecurring,
    cancelledReservations,
  };
}

export async function listReservations(query) {
  await expireStalePendingReservations({ source: 'list' });
  await completePastActiveReservations({ clientId: query.clientId || null });
  const from = query.from || getTodayInArgentina();
  const to = query.to || addDaysToDate(from, 30);
  return reservationsRepository.listReservations({ ...query, from, to });
}

export async function getMyReservations(clientId, query) {
  await expireStalePendingReservations({ source: 'list' });
  await completePastActiveReservations({ clientId });
  const from = query.from || addDaysToDate(getTodayInArgentina(), -30);
  const to = query.to || addDaysToDate(getTodayInArgentina(), 60);
  return reservationsRepository.listReservations({ ...query, clientId, from, to });
}

export async function getClassReservations(classId) {
  await expireStalePendingReservations({ source: 'list' });
  return reservationsRepository.listClassReservations(classId);
}

export async function getClientReservations(clientId, query) {
  return getMyReservations(clientId, query);
}

export async function getMyRecoveryCredits(clientId) {
  await reservationsRepository.expireRecoveryCredits();
  return reservationsRepository.listRecoveryCredits(clientId, { status: 'available' });
}

export async function createRecurringReservation(payload, adminId) {
  // Admin puede asignar fijo aunque el cliente esté en deuda.
  const client = await validateClientCanBook(payload.clientId, { allowDebt: true });

  const [templateRows] = await pool.query(
    'SELECT * FROM schedule_templates WHERE id = ? AND is_active = 1',
    [payload.scheduleTemplateId]
  );

  if (!templateRows[0]) {
    throw createAppError('Horario no encontrado', 404);
  }

  const template = templateRows[0];
  await plansRepository.expireClientPlans();
  const activePlan = await plansRepository.findActiveClientPlan(client.id);

  if (!activePlan || !planAllowsFixedSchedules(activePlan)) {
    throw createAppError(
      'Los horarios fijos solo están disponibles para planes de más de 3 clases mensuales.',
      400
    );
  }

  const slotLimit = getFixedScheduleSlotLimit(activePlan);
  const existingForTemplate = await reservationsRepository.findRecurringByClientAndTemplate(
    client.id,
    template.id
  );

  if (existingForTemplate?.status === 'active' || existingForTemplate?.status === 'paused') {
    throw createAppError('Este cliente ya tiene asignado ese horario fijo.', 400);
  }

  const sameDayFixed = await reservationsRepository.countOccupyingRecurringByClientAndDay(
    client.id,
    template.day_of_week
  );

  if (sameDayFixed > 0) {
    throw createAppError(
      'Este cliente ya tiene un horario fijo ese día. Solo puede haber una clase por día.',
      400
    );
  }

  const occupyingCount = await reservationsRepository.countOccupyingRecurringByClient(client.id);

  if (occupyingCount >= slotLimit) {
    throw createAppError(
      `Este plan permite hasta ${slotLimit} horario${slotLimit === 1 ? '' : 's'} fijo${slotLimit === 1 ? '' : 's'} semanal${slotLimit === 1 ? '' : 'es'}.`,
      400
    );
  }

  const settings = await getSettings();
  const templateCapacity = Number(template.capacity || settings?.maxClassCapacity || 6);
  const templateOccupied = await reservationsRepository.countOccupyingRecurringByTemplate(
    template.id
  );

  if (templateOccupied >= templateCapacity) {
    throw createAppError(
      'Ese horario fijo ya no tiene cupos disponibles. Otro cliente ya lo ocupa.',
      400
    );
  }

  const startDate = payload.startDate || getTodayInArgentina();
  const endDate = payload.endDate || activePlan.endDate || null;
  let recurring;

  if (existingForTemplate) {
    recurring = await reservationsRepository.updateRecurringReservation(existingForTemplate.id, {
      status: 'active',
      startDate,
      endDate,
      clientPlanId: activePlan.id,
    });
  } else {
    recurring = await reservationsRepository.createRecurringReservation({
      clientId: client.id,
      scheduleTemplateId: template.id,
      clientPlanId: activePlan.id,
      dayOfWeek: template.day_of_week,
      startTime: normalizeTime(template.start_time),
      startDate,
      endDate,
      createdByAdminId: adminId,
    });
  }

  // Asegura clases vinculadas y materializa todos los fijos del cliente en orden de fecha.
  await generateClasses();

  const processing = await processRecurringReservations({
    clientId: client.id,
  });

  await clientsRepository.createClientHistory({
    clientId: client.id,
    actionType: 'client_updated',
    description: `Horario fijo asignado: ${recurring.startTime}`,
    metadata: {
      recurringReservationId: recurring.id,
      processing,
    },
    performedById: adminId,
  });

  return { recurring, processing };
}

export async function updateRecurringReservation(id, payload, adminId) {
  const recurringId = Number(id);
  const recurring = await reservationsRepository.findRecurringById(recurringId);

  if (!recurring) {
    throw createAppError('Horario fijo no encontrado', 404);
  }

  let processing = null;

  if (payload.status === 'active' && recurring.status !== 'active') {
    await plansRepository.expireClientPlans();
    const activePlan = await plansRepository.findActiveClientPlan(recurring.clientId);

    if (!activePlan || !planAllowsFixedSchedules(activePlan)) {
      throw createAppError(
        'Los horarios fijos solo están disponibles para planes de más de 3 clases mensuales.',
        400
      );
    }

    const slotLimit = getFixedScheduleSlotLimit(activePlan);
    const occupyingCount = await reservationsRepository.countOccupyingRecurringByClient(
      recurring.clientId
    );
    const adjustedCount = recurring.status === 'paused' ? occupyingCount - 1 : occupyingCount;

    if (adjustedCount >= slotLimit) {
      throw createAppError(
        `Este plan permite hasta ${slotLimit} horario${slotLimit === 1 ? '' : 's'} fijo${slotLimit === 1 ? '' : 's'}.`,
        400
      );
    }

    const settings = await getSettings();
    const [templateRows] = await pool.query(
      'SELECT id, capacity, is_active FROM schedule_templates WHERE id = ?',
      [recurring.scheduleTemplateId]
    );
    const template = templateRows[0];

    if (!template || !Number(template.is_active)) {
      throw createAppError(
        'No se puede reanudar: ese horario ya no está disponible en la grilla del estudio.',
        400
      );
    }

    const templateCapacity = Number(template.capacity || settings?.maxClassCapacity || 6);
    const templateOccupied = await reservationsRepository.countOccupyingRecurringByTemplate(
      recurring.scheduleTemplateId
    );

    if (templateOccupied >= templateCapacity) {
      throw createAppError(
        'No se puede reanudar: ese horario fijo ya no tiene cupos disponibles. Otro cliente lo está usando.',
        400
      );
    }
  }

  const updated = await reservationsRepository.updateRecurringReservation(recurringId, payload);

  if (payload.status === 'paused' || payload.status === 'cancelled') {
    const today = getTodayInArgentina();
    const futureReservations =
      await reservationsRepository.listActiveFutureReservationsByRecurring(recurringId, today);

    for (const reservation of futureReservations) {
      try {
        await cancelReservation({
          reservationId: reservation.id,
          cancelledBy: 'admin',
          cancellationReason:
            payload.status === 'paused'
              ? 'Horario fijo pausado'
              : 'Horario fijo cancelado',
          adminId,
        });
      } catch {
        // Continuar con el resto si alguna ya no está activa.
      }
    }
  }

  if (payload.status === 'active') {
    await generateClasses();
    processing = await processRecurringReservations({
      clientId: recurring.clientId,
      recurringReservationId: recurringId,
    });

    if (!processing.created) {
      // Revertir a pausado si no se pudo materializar ninguna clase.
      if (recurring.status === 'paused') {
        await reservationsRepository.updateRecurringReservation(recurringId, {
          status: 'paused',
        });
      }

      const firstError = processing.errorDetails?.[0]?.message;
      throw createAppError(
        firstError ||
          'No se pudo reanudar el horario fijo: no quedaron cupos libres en las clases o en el plan.',
        400
      );
    }
  }

  await clientsRepository.createClientHistory({
    clientId: recurring.clientId,
    actionType: 'client_updated',
    description: `Horario fijo actualizado (${payload.status || 'datos'})`,
    metadata: { recurringReservationId: recurringId, ...payload, processing },
    performedById: adminId,
  });

  return {
    recurring: updated,
    processing,
  };
}

export async function listClientRecurring(clientId) {
  return reservationsRepository.listRecurringByClient(clientId);
}

export async function listMyRecurring(clientId) {
  const recurring = await reservationsRepository.listRecurringByClient(clientId);
  return recurring.filter((item) => item.status === 'active' || item.status === 'paused');
}

export async function processRecurringReservations(options = {}) {
  await reservationsRepository.expireRecoveryCredits();
  await plansRepository.expireClientPlans();

  let recurringList = await reservationsRepository.listActiveRecurringReservations();

  if (options.recurringReservationId) {
    const targetId = Number(options.recurringReservationId);
    recurringList = recurringList.filter((item) => item.id === targetId);
  } else if (options.clientId) {
    const targetClientId = Number(options.clientId);
    recurringList = recurringList.filter((item) => item.clientId === targetClientId);
  }

  const today = getTodayInArgentina();
  const generationTo = addDaysToDate(today, (env.classGenerationWeeksAhead || 8) * 7);

  let created = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails = [];
  const candidates = [];

  for (const recurring of recurringList) {
    const recurringEnd = recurring.endDate ? toDateString(recurring.endDate) : null;

    if (recurringEnd && recurringEnd < today) {
      await reservationsRepository.updateRecurringReservation(recurring.id, {
        status: 'cancelled',
      });
      continue;
    }

    const activePlan = await plansRepository.findActiveClientPlan(recurring.clientId);
    const planEnd = activePlan?.endDate ? toDateString(activePlan.endDate) : null;
    const planStart = activePlan?.startDate ? toDateString(activePlan.startDate) : null;
    let toDate = generationTo;

    if (recurringEnd && recurringEnd < toDate) {
      toDate = recurringEnd;
    }

    if (planEnd && planEnd < toDate) {
      toDate = planEnd;
    }

    if (toDate < today) {
      skipped += 1;
      continue;
    }

    const recurringStart = toDateString(recurring.startDate) || today;
    let fromDate = recurringStart > today ? recurringStart : today;
    if (planStart && planStart > fromDate) {
      fromDate = planStart;
    }

    if (fromDate > toDate) {
      skipped += 1;
      continue;
    }

    const classes = await reservationsRepository.findFutureClassesForRecurring(
      recurring,
      fromDate,
      toDate
    );

    for (const classItem of classes) {
      candidates.push({ recurring, classItem });
    }
  }

  // Lunes + martes (y cualquier otro fijo) se completan en orden de fecha,
  // respetando 2/semana y el cupo total del abono.
  candidates.sort((a, b) => {
    const dateCompare = String(a.classItem.classDate).localeCompare(String(b.classItem.classDate));
    if (dateCompare !== 0) return dateCompare;
    return String(a.classItem.startTime).localeCompare(String(b.classItem.startTime));
  });

  for (const { recurring, classItem } of candidates) {
    try {
      const existing = await reservationsRepository.findReservationByClientAndClass(
        recurring.clientId,
        classItem.id
      );

      if (existing && ACTIVE_RESERVATION_STATUSES.includes(existing.status)) {
        skipped += 1;
        continue;
      }

      const sameDay = await reservationsRepository.findActiveReservationByClientAndDate(
        recurring.clientId,
        classItem.classDate
      );

      if (sameDay) {
        skipped += 1;
        continue;
      }

      await createReservation({
        clientId: recurring.clientId,
        generatedClassId: classItem.id,
        status: 'confirmed',
        bookingType: 'recurring',
        recurringReservationId: recurring.id,
        createdByAdminId: recurring.createdByAdminId,
      });

      created += 1;
    } catch (error) {
      const message = error.message || 'Error al crear reserva fija';
      const isQuotaLimit =
        message.includes('límite de clases') ||
        message.includes('cupo del abono') ||
        message.includes('ya comenzó') ||
        message.includes('ya finalizó');

      if (isQuotaLimit) {
        skipped += 1;
        continue;
      }

      errors += 1;
      errorDetails.push({
        classDate: classItem.classDate,
        startTime: classItem.startTime,
        message,
      });
    }
  }

  return { created, skipped, errors, errorDetails: errorDetails.slice(0, 10) };
}
