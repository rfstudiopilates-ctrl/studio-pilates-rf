import { createAppError } from '../../utils/AppError.js';
import {
  addDaysToDate,
  formatTimeDisplay,
  getNowInArgentina,
  getTodayInArgentina,
  getWeekStartDate,
} from '../../utils/dates.js';
import { generateClasses } from './classes.generation.js';
import * as classesRepository from './classes.repository.js';
import { CLASS_STATUSES } from './classes.constants.js';
import * as reservationsRepository from '../reservations/reservations.repository.js';
import { cancelReservation } from '../reservations/reservations.service.js';
import { listScheduleTemplates } from '../schedules/schedules.repository.js';

function getArgentinaClockParts() {
  const now = getNowInArgentina();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return {
    today: getTodayInArgentina(),
    fromTime: `${hours}:${minutes}`,
  };
}

export async function listClasses(query) {
  return classesRepository.listClasses(query);
}

export async function getClassCalendar(query) {
  const from = query.from || getWeekStartDate();
  const to = query.to || addDaysToDate(from, 6);
  const classes = await classesRepository.listClassesInRange({
    from,
    to,
    status: query.status,
  });

  const grouped = {};
  for (const classItem of classes) {
    if (!grouped[classItem.classDate]) {
      grouped[classItem.classDate] = [];
    }
    grouped[classItem.classDate].push(classItem);
  }

  return {
    from,
    to,
    classes,
    grouped,
    totalClasses: classes.length,
  };
}

export async function getAvailability(query) {
  const from = query.from || getTodayInArgentina();
  const to = query.to || addDaysToDate(from, 13);
  const classes = await classesRepository.listClassesInRange({
    from,
    to,
    status: 'scheduled',
  });

  return {
    from,
    to,
    items: classes.map((classItem) => ({
      id: classItem.id,
      classDate: classItem.classDate,
      startTime: classItem.startTime,
      endTime: classItem.endTime,
      capacity: classItem.capacity,
      bookedCount: classItem.bookedCount,
      spotsAvailable: classItem.spotsAvailable,
      isFull: classItem.isFull,
    })),
  };
}

export async function getClassById(id) {
  const classItem = await classesRepository.getClassById(id);
  if (!classItem) {
    throw createAppError('Clase no encontrada', 404);
  }
  return classItem;
}

export async function triggerClassGeneration() {
  return generateClasses();
}

export async function updateClass(id, payload) {
  const classItem = await getClassById(id);

  if (payload.capacity !== undefined && payload.capacity < classItem.bookedCount) {
    throw createAppError(
      `La capacidad no puede ser menor a las reservas actuales (${classItem.bookedCount})`,
      400
    );
  }

  if (payload.status && !CLASS_STATUSES.includes(payload.status)) {
    throw createAppError('Estado de clase inválido', 400);
  }

  if (payload.status === 'cancelled' && classItem.bookedCount > 0) {
    throw createAppError(
      'No podés cancelar una clase con reservas. Cancelá las reservas primero.',
      400
    );
  }

  return classesRepository.updateClass(id, payload);
}

export async function listScheduleCleanupCandidates() {
  const { today, fromTime } = getArgentinaClockParts();
  const items = await classesRepository.listOrphanFutureScheduleGroups({
    fromDate: today,
    fromTime,
  });

  const byKey = new Map(
    items.map((item) => [`${item.dayOfWeek}-${item.startTime}`, { ...item, recurringCount: 0 }])
  );

  // Incluye fijos huérfanos aunque no queden clases programadas.
  const orphanRecurring = await reservationsRepository.listOrphanActiveRecurringByDayTime();
  for (const item of orphanRecurring) {
    const key = `${item.dayOfWeek}-${item.startTime}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.recurringCount = item.recurringCount;
    } else {
      byKey.set(key, {
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        classCount: 0,
        activeReservations: 0,
        firstClassDate: null,
        lastClassDate: null,
        recurringCount: item.recurringCount,
      });
    }
  }

  for (const item of byKey.values()) {
    if (item.recurringCount) {
      continue;
    }
    const recurring = await reservationsRepository.listActiveRecurringByDayTime(
      item.dayOfWeek,
      item.startTime
    );
    item.recurringCount = recurring.length;
  }

  const sorted = [...byKey.values()].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) {
      return a.dayOfWeek - b.dayOfWeek;
    }
    return String(a.startTime).localeCompare(String(b.startTime));
  });

  return {
    fromDate: today,
    items: sorted,
  };
}

export async function previewCancelFutureBySchedule({ dayOfWeek, startTime }) {
  const { today, fromTime } = getArgentinaClockParts();
  const time = formatTimeDisplay(startTime);
  const classes = await classesRepository.listFutureScheduledByDayTime({
    dayOfWeek,
    startTime: time,
    fromDate: today,
    fromTime,
  });
  const recurring = await reservationsRepository.listActiveRecurringByDayTime(dayOfWeek, time);
  const activeTemplates = await listScheduleTemplates();
  const stillInTemplate = activeTemplates.some(
    (slot) =>
      Number(slot.dayOfWeek) === Number(dayOfWeek) &&
      formatTimeDisplay(slot.startTime) === time
  );

  let activeReservations = 0;
  for (const classItem of classes) {
    const reservations = await reservationsRepository.listActiveReservationsByClassId(classItem.id);
    activeReservations += reservations.length;
  }

  return {
    dayOfWeek: Number(dayOfWeek),
    startTime: time,
    fromDate: today,
    stillInTemplate,
    classCount: classes.length,
    activeReservations,
    recurringCount: recurring.length,
    firstClassDate: classes[0]?.classDate || null,
    lastClassDate: classes[classes.length - 1]?.classDate || null,
  };
}

/**
 * Cancela en bloque todas las clases futuras de un día+hora:
 * reservas (con devolución de cupo), fijos y las clases generadas.
 */
export async function cancelFutureClassesBySchedule({ dayOfWeek, startTime, adminId }) {
  const { today, fromTime } = getArgentinaClockParts();
  const time = formatTimeDisplay(startTime);

  const activeTemplates = await listScheduleTemplates();
  const stillInTemplate = activeTemplates.some(
    (slot) =>
      Number(slot.dayOfWeek) === Number(dayOfWeek) &&
      formatTimeDisplay(slot.startTime) === time
  );

  if (stillInTemplate) {
    throw createAppError(
      'Ese horario sigue en la plantilla activa. Quitálo, guardá la plantilla y después cancelá las clases futuras.',
      400
    );
  }

  const classes = await classesRepository.listFutureScheduledByDayTime({
    dayOfWeek,
    startTime: time,
    fromDate: today,
    fromTime,
  });

  const recurringList = await reservationsRepository.listActiveRecurringByDayTime(dayOfWeek, time);

  if (classes.length === 0 && recurringList.length === 0) {
    return {
      dayOfWeek: Number(dayOfWeek),
      startTime: time,
      cancelledClasses: 0,
      cancelledReservations: 0,
      returnedQuota: 0,
      cancelledRecurring: 0,
      errors: [],
      empty: true,
    };
  }

  const reason = `Horario discontinuado (${dayOfWeekLabel(dayOfWeek)} ${time})`;
  let cancelledReservations = 0;
  let returnedQuota = 0;
  let cancelledClasses = 0;
  let cancelledRecurring = 0;
  const errors = [];

  for (const classItem of classes) {
    const reservations = await reservationsRepository.listActiveReservationsByClassId(classItem.id);

    for (const reservation of reservations) {
      try {
        const result = await cancelReservation({
          reservationId: reservation.id,
          cancelledBy: 'admin',
          cancellationReason: reason,
          adminId,
          silent: true,
          forceReturnQuota: true,
        });
        cancelledReservations += 1;
        if (result.returnedToPlan) {
          returnedQuota += 1;
        }
      } catch (error) {
        errors.push({
          type: 'reservation',
          id: reservation.id,
          message: error.message || 'No se pudo cancelar la reserva',
        });
      }
    }

    try {
      const fresh = await classesRepository.getClassById(classItem.id);
      if (fresh && fresh.status === 'scheduled') {
        if (fresh.bookedCount > 0) {
          await classesRepository.syncBookedCountFromReservations(classItem.id);
        }
        const synced = await classesRepository.getClassById(classItem.id);
        if (synced?.bookedCount > 0) {
          errors.push({
            type: 'class',
            id: classItem.id,
            message: 'La clase aún tiene reservas activas',
          });
          continue;
        }
        await classesRepository.updateClass(classItem.id, { status: 'cancelled' });
        cancelledClasses += 1;
      }
    } catch (error) {
      errors.push({
        type: 'class',
        id: classItem.id,
        message: error.message || 'No se pudo cancelar la clase',
      });
    }
  }

  for (const recurring of recurringList) {
    try {
      await reservationsRepository.updateRecurringReservation(recurring.id, {
        status: 'cancelled',
        endDate: today,
      });
      cancelledRecurring += 1;

      const futureFromRecurring =
        await reservationsRepository.listActiveFutureReservationsByRecurring(recurring.id, today);

      for (const reservation of futureFromRecurring) {
        try {
          const result = await cancelReservation({
            reservationId: reservation.id,
            cancelledBy: 'admin',
            cancellationReason: reason,
            adminId,
            silent: true,
            forceReturnQuota: true,
          });
          cancelledReservations += 1;
          if (result.returnedToPlan) {
            returnedQuota += 1;
          }
        } catch (error) {
          errors.push({
            type: 'reservation',
            id: reservation.id,
            message: error.message || 'No se pudo cancelar la reserva del fijo',
          });
        }
      }
    } catch (error) {
      errors.push({
        type: 'recurring',
        id: recurring.id,
        message: error.message || 'No se pudo cancelar el horario fijo',
      });
    }
  }

  return {
    dayOfWeek: Number(dayOfWeek),
    startTime: time,
    cancelledClasses,
    cancelledReservations,
    returnedQuota,
    cancelledRecurring,
    errors,
  };
}

function dayOfWeekLabel(dayOfWeek) {
  const labels = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
    7: 'Domingo',
  };
  return labels[Number(dayOfWeek)] || `Día ${dayOfWeek}`;
}
