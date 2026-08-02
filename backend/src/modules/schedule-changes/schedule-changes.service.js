import { pool } from '../../config/database.js';
import { createAppError } from '../../utils/AppError.js';
import {
  canCancelClass,
  getHoursUntilClass,
} from '../../utils/dates.js';
import { getSettings } from '../settings/settings.repository.js';
import * as clientsRepository from '../clients/clients.repository.js';
import * as classesRepository from '../classes/classes.repository.js';
import * as plansRepository from '../plans/plans.repository.js';
import { refreshPlanUsageCounters } from '../plans/plans.usage.js';
import * as reservationsRepository from '../reservations/reservations.repository.js';
import { processRecurringReservations } from '../reservations/reservations.service.js';
import { SCHEDULE_CHANGE_VACATED_REASON } from '../reservations/reservations.constants.js';
import * as scheduleChangesRepository from './schedule-changes.repository.js';
import {
  notifyScheduleChangeApproved,
  notifyScheduleChangeRequested,
  runNotificationSafely,
} from '../notifications/notifications.dispatcher.js';

async function validateTargetClassForChange(generatedClassId, connection) {
  const classItem = await classesRepository.getClassByIdForUpdate(generatedClassId, connection);

  if (!classItem) {
    throw createAppError('Clase destino no encontrada', 404);
  }

  if (classItem.status !== 'scheduled') {
    throw createAppError('La clase destino no está disponible', 400);
  }

  if (getHoursUntilClass(classItem.classDate, classItem.startTime) <= 0) {
    throw createAppError('La clase destino ya comenzó o finalizó', 400);
  }

  if (classItem.bookedCount >= classItem.capacity) {
    throw createAppError('La clase destino no tiene cupos disponibles', 400);
  }

  return classItem;
}

/**
 * Mueve la reserva a otra clase y deja un marcador cancelado en el origen.
 * Sin ese marcador, el fijo del día liberado cuenta como cupo semanal fantasma
 * y puede bloquear otras clases de la misma semana (ej. miércoles).
 */
async function reassignReservation({
  reservation,
  fromClassId,
  toClassId,
  connection,
}) {
  if (reservation.generatedClassId !== fromClassId) {
    throw createAppError('La reserva ya no está en la clase original', 400);
  }

  if (fromClassId === toClassId) {
    throw createAppError('La clase destino debe ser diferente a la original', 400);
  }

  const existingOnTarget = await reservationsRepository.findReservationByClientAndClass(
    reservation.clientId,
    toClassId,
    connection
  );

  if (existingOnTarget && existingOnTarget.id !== reservation.id) {
    if (['pending', 'confirmed'].includes(existingOnTarget.status)) {
      throw createAppError('El cliente ya tiene una reserva activa en la clase destino', 400);
    }

    // Libera UNIQUE cliente+clase si quedó una fila cancelada previa en el destino.
    await reservationsRepository.deleteReservationById(existingOnTarget.id, connection);
  }

  await classesRepository.getClassByIdForUpdate(fromClassId, connection);
  await validateTargetClassForChange(toClassId, connection);

  const updated = await reservationsRepository.updateReservation(
    reservation.id,
    { generatedClassId: toClassId },
    connection
  );

  const vacatedExisting = await reservationsRepository.findReservationByClientAndClass(
    reservation.clientId,
    fromClassId,
    connection
  );

  if (!vacatedExisting) {
    await reservationsRepository.createVacatedReservationMarker(
      {
        clientId: reservation.clientId,
        generatedClassId: fromClassId,
        clientPlanId: reservation.clientPlanId || null,
        bookingType: reservation.bookingType || 'standard',
        cancellationReason: SCHEDULE_CHANGE_VACATED_REASON,
      },
      connection
    );
  }

  await classesRepository.syncBookedCountFromReservations(fromClassId, connection);
  await classesRepository.syncBookedCountFromReservations(toClassId, connection);

  return updated;
}

async function rematerializeClientFixedSchedules(clientId) {
  try {
    await processRecurringReservations({ clientId });
    const activePlan = await plansRepository.findActiveClientPlan(clientId);
    if (activePlan?.id) {
      await refreshPlanUsageCounters(activePlan.id);
    }
  } catch {
    // El cron/job posterior puede completar; no fallar el approve.
  }
}

export async function createScheduleChangeRequest({
  clientId,
  reservationId,
  toGeneratedClassId,
  reason,
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const reservation = await reservationsRepository.findReservationById(reservationId, connection);

    if (!reservation || reservation.clientId !== clientId) {
      throw createAppError('Reserva no encontrada', 404);
    }

    if (reservation.status !== 'confirmed') {
      throw createAppError('Solo podés solicitar cambio de reservas confirmadas', 400);
    }

    const settings = await getSettings();

    if (
      !canCancelClass(
        reservation.classDate,
        reservation.startTime,
        settings.cancellationHours
      )
    ) {
      throw createAppError(
        `Solo podés solicitar cambios con al menos ${settings.cancellationHours} horas de anticipación`,
        400
      );
    }

    if (reservation.generatedClassId === toGeneratedClassId) {
      throw createAppError('Debés elegir una clase distinta a la actual', 400);
    }

    await validateTargetClassForChange(toGeneratedClassId, connection);

    const pending = await scheduleChangesRepository.findPendingByReservationId(
      reservationId,
      connection
    );
    const reusable =
      pending ||
      (await scheduleChangesRepository.findReusableByReservationId(reservationId, connection));

    const reopenPayload = {
      status: 'pending',
      fromGeneratedClassId: reservation.generatedClassId,
      toGeneratedClassId,
      reason: reason || reusable?.reason || null,
      adminNotes: null,
      reviewedByAdminId: null,
      reviewedAt: null,
    };

    const request = reusable
      ? await scheduleChangesRepository.updateScheduleChange(reusable.id, reopenPayload, connection)
      : await scheduleChangesRepository.createScheduleChangeRequest(
          {
            reservationId,
            clientId,
            fromGeneratedClassId: reservation.generatedClassId,
            toGeneratedClassId,
            reason,
          },
          connection
        );

    const wasResubmit = Boolean(reusable);

    await clientsRepository.createClientHistory({
      clientId,
      actionType: 'client_updated',
      description: wasResubmit
        ? 'Solicitud de cambio de horario reenviada'
        : 'Solicitud de cambio de horario creada',
      metadata: {
        scheduleChangeRequestId: request.id,
        fromClassId: reservation.generatedClassId,
        toClassId: toGeneratedClassId,
        resubmitted: wasResubmit,
        previousStatus: reusable?.status || null,
      },
      performedByType: 'client',
      performedById: clientId,
      connection,
    });

    await connection.commit();

    runNotificationSafely(
      notifyScheduleChangeRequested({
        request,
        clientName: request.clientName,
      })
    );

    return request;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function cancelScheduleChangeRequest(id, clientId) {
  const request = await scheduleChangesRepository.findScheduleChangeById(id);

  if (!request || request.clientId !== clientId) {
    throw createAppError('Solicitud no encontrada', 404);
  }

  if (request.status !== 'pending') {
    throw createAppError('Solo podés cancelar solicitudes pendientes', 400);
  }

  return scheduleChangesRepository.updateScheduleChange(id, { status: 'cancelled' });
}

export async function approveScheduleChangeRequest(id, adminId, payload = {}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const request = await scheduleChangesRepository.findScheduleChangeById(id, connection);

    if (!request) {
      throw createAppError('Solicitud no encontrada', 404);
    }

    if (request.status !== 'pending') {
      throw createAppError('Solo se pueden aprobar solicitudes pendientes', 400);
    }

    const toClassId = payload.toGeneratedClassId || request.toGeneratedClassId;
    const reservation = await reservationsRepository.findReservationByIdForUpdate(
      request.reservationId,
      connection
    );

    if (!reservation || reservation.status !== 'confirmed') {
      throw createAppError('La reserva ya no está activa', 400);
    }

    await clientsRepository.lockClientById(reservation.clientId, connection);

    const updatedReservation = await reassignReservation({
      reservation,
      fromClassId: request.fromGeneratedClassId,
      toClassId,
      connection,
    });

    const updatedRequest = await scheduleChangesRepository.updateScheduleChange(
      id,
      {
        status: 'approved',
        toGeneratedClassId: toClassId,
        adminNotes: payload.adminNotes || null,
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
      },
      connection
    );

    await clientsRepository.createClientHistory({
      clientId: request.clientId,
      actionType: 'client_updated',
      description: 'Cambio de horario aprobado',
      metadata: {
        scheduleChangeRequestId: id,
        fromClassId: request.fromGeneratedClassId,
        toClassId,
        reservationId: updatedReservation.id,
      },
      performedById: adminId,
      connection,
    });

    await connection.commit();

    await rematerializeClientFixedSchedules(request.clientId);

    const fullRequest = await scheduleChangesRepository.findScheduleChangeById(id);

    runNotificationSafely(
      notifyScheduleChangeApproved({
        request: fullRequest,
        clientId: fullRequest.clientId,
      })
    );

    return {
      request: updatedRequest,
      reservation: updatedReservation,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function rejectScheduleChangeRequest(id, adminId, adminNotes) {
  const request = await scheduleChangesRepository.findScheduleChangeById(id);

  if (!request) {
    throw createAppError('Solicitud no encontrada', 404);
  }

  if (request.status !== 'pending') {
    throw createAppError('Solo se pueden rechazar solicitudes pendientes', 400);
  }

  const updated = await scheduleChangesRepository.updateScheduleChange(id, {
    status: 'rejected',
    adminNotes: adminNotes || null,
    reviewedByAdminId: adminId,
    reviewedAt: new Date(),
  });

  await clientsRepository.createClientHistory({
    clientId: request.clientId,
    actionType: 'client_updated',
    description: 'Cambio de horario rechazado',
    metadata: { scheduleChangeRequestId: id, adminNotes },
    performedById: adminId,
  });

  return updated;
}

export async function adminReassignReservation({
  reservationId,
  toGeneratedClassId,
  adminNotes,
  adminId,
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const reservation = await reservationsRepository.findReservationById(reservationId, connection);

    if (!reservation) {
      throw createAppError('Reserva no encontrada', 404);
    }

    if (reservation.status !== 'confirmed') {
      throw createAppError('Solo se pueden reasignar reservas confirmadas', 400);
    }

    const fromClassId = reservation.generatedClassId;

    const updatedReservation = await reassignReservation({
      reservation,
      fromClassId,
      toClassId: toGeneratedClassId,
      connection,
    });

    const existingPending = await scheduleChangesRepository.findPendingByReservationId(
      reservationId,
      connection
    );

    const request =
      existingPending ||
      (await scheduleChangesRepository.createScheduleChangeRequest(
        {
          reservationId,
          clientId: reservation.clientId,
          fromGeneratedClassId: fromClassId,
          toGeneratedClassId,
          reason: adminNotes || 'Reasignación directa por el administrador',
        },
        connection
      ));

    const updatedRequest = await scheduleChangesRepository.updateScheduleChange(
      request.id,
      {
        status: 'approved',
        fromGeneratedClassId: fromClassId,
        toGeneratedClassId,
        reason: existingPending
          ? existingPending.reason || adminNotes || 'Reasignación directa por el administrador'
          : adminNotes || 'Reasignación directa por el administrador',
        adminNotes: adminNotes || null,
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
      },
      connection
    );

    await clientsRepository.createClientHistory({
      clientId: reservation.clientId,
      actionType: 'client_updated',
      description: 'Reserva reasignada por el administrador',
      metadata: {
        scheduleChangeRequestId: updatedRequest.id,
        reservationId,
        toClassId: toGeneratedClassId,
      },
      performedById: adminId,
      connection,
    });

    await connection.commit();

    await rematerializeClientFixedSchedules(reservation.clientId);

    const fullRequest = await scheduleChangesRepository.findScheduleChangeById(updatedRequest.id);

    runNotificationSafely(
      notifyScheduleChangeApproved({
        request: fullRequest,
        clientId: fullRequest.clientId,
      })
    );

    return {
      request: updatedRequest,
      reservation: updatedReservation,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listScheduleChanges(query) {
  return scheduleChangesRepository.listScheduleChanges(query);
}

export async function getMyScheduleChanges(clientId, query) {
  return scheduleChangesRepository.listScheduleChanges({ ...query, clientId });
}

export async function getScheduleChangeById(id) {
  const request = await scheduleChangesRepository.findScheduleChangeById(id);

  if (!request) {
    throw createAppError('Solicitud no encontrada', 404);
  }

  return request;
}

export async function getPendingScheduleChangesCount() {
  return scheduleChangesRepository.countPendingScheduleChanges();
}
