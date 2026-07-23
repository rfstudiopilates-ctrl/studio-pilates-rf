import * as plansRepository from './plans.repository.js';
import { pool } from '../../config/database.js';
import {
  addDaysToDate,
  getExpectedPlanUsageByDate,
  getPlanAvailability,
  getTodayInArgentina,
  getWeekStartDate,
  toDateString,
} from '../../utils/dates.js';
import {
  countConsumingReservationsInRange,
  listActiveRecurringDaysByClient,
  listClientClassDatesInRange,
  listConsumingReservationDatesInRange,
} from '../reservations/reservations.repository.js';

function resolveConnection(connection) {
  return connection || pool;
}

function getPlanPeriodRange(clientPlan) {
  const planStart = toDateString(clientPlan.startDate);
  const planEnd = toDateString(clientPlan.endDate) || planStart;
  return { planStart, planEnd };
}

/**
 * Cupo semanal por días ocupados:
 * - reservas que consumen plan en la semana
 * - más días de horario fijo ya ocurridos (hoy/pasado) sin ninguna reserva
 *   (ni cancelada). Si canceló a tiempo, el cupo se libera para recuperar
 *   el mismo día u otro día.
 */
async function countWeeklySlotsUsed(clientPlan, weekStart, weekEnd, connection) {
  const db = resolveConnection(connection);
  const { planStart, planEnd } = getPlanPeriodRange(clientPlan);
  const today = getTodayInArgentina();

  const [reservationDates, recurringDays, datesWithAnyReservation] = await Promise.all([
    listConsumingReservationDatesInRange(
      clientPlan.clientId,
      clientPlan.id,
      weekStart,
      weekEnd,
      db
    ),
    listActiveRecurringDaysByClient(clientPlan.clientId, db),
    listClientClassDatesInRange(clientPlan.clientId, weekStart, weekEnd, db),
  ]);

  const occupiedDays = new Set(reservationDates.map((date) => toDateString(date)).filter(Boolean));
  const daysWithReservationRecord = new Set(
    datesWithAnyReservation.map((date) => toDateString(date)).filter(Boolean)
  );

  for (const dayOfWeek of recurringDays) {
    if (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 7) continue;

    const dateInWeek = addDaysToDate(weekStart, dayOfWeek - 1);
    if (dateInWeek < weekStart || dateInWeek > weekEnd) continue;
    if (planStart && dateInWeek < planStart) continue;
    if (planEnd && dateInWeek > planEnd) continue;

    // Si hay reserva cancelada a tiempo ese día, NO cuenta: el cliente puede recuperar.
    // Solo cuenta el fijo “fantasma” cuando no hubo ninguna reserva generada.
    if (dateInWeek <= today && !daysWithReservationRecord.has(dateInWeek)) {
      occupiedDays.add(dateInWeek);
    }
  }

  return occupiedDays.size;
}

function buildAvailability({
  clientPlan,
  weeklyUsed,
  monthlyUsed,
  asOfDate,
}) {
  const weeklyLimit = Number(clientPlan.weeklyClassesLimit || 0);
  const monthlyLimit = Number(clientPlan.monthlyClassesLimit || 0);
  const expectedUsed = getExpectedPlanUsageByDate(clientPlan, asOfDate);
  const catchUpSlots = Math.max(0, expectedUsed - monthlyUsed);
  const effectiveWeeklyLimit = weeklyLimit + catchUpSlots;
  const weeklyRemaining = effectiveWeeklyLimit - weeklyUsed;
  const monthlyRemaining = monthlyLimit - monthlyUsed;

  return {
    weeklyUsed,
    monthlyUsed,
    weeklyRemaining: Math.max(0, weeklyRemaining),
    monthlyRemaining: Math.max(0, monthlyRemaining),
    catchUpSlots,
    expectedUsed,
    effectiveWeeklyLimit,
    canBook: monthlyRemaining > 0 && weeklyRemaining > 0,
  };
}

/**
 * Cupo semanal: ritmo normal (ej. 2/semana) + catch-up de clases no usadas
 * de semanas anteriores / inicio en el pasado.
 * Cupo total: vigencia completa del abono (startDate → endDate).
 */
export async function getAvailabilityForClassDate(clientPlan, classDate, connection = null) {
  if (!clientPlan || clientPlan.status !== 'active') {
    return {
      weeklyUsed: 0,
      monthlyUsed: 0,
      weeklyRemaining: 0,
      monthlyRemaining: 0,
      catchUpSlots: 0,
      expectedUsed: 0,
      effectiveWeeklyLimit: 0,
      canBook: false,
    };
  }

  const db = resolveConnection(connection);
  const normalizedClassDate = toDateString(classDate);
  const { planStart, planEnd } = getPlanPeriodRange(clientPlan);

  if (
    !normalizedClassDate ||
    !planStart ||
    normalizedClassDate < planStart ||
    (planEnd && normalizedClassDate > planEnd)
  ) {
    return {
      weeklyUsed: 0,
      monthlyUsed: 0,
      weeklyRemaining: 0,
      monthlyRemaining: 0,
      catchUpSlots: 0,
      expectedUsed: 0,
      effectiveWeeklyLimit: 0,
      canBook: false,
    };
  }

  const weekStart = getWeekStartDate(normalizedClassDate);
  const weekEnd = addDaysToDate(weekStart, 6);

  const [weeklyUsed, monthlyUsed] = await Promise.all([
    countWeeklySlotsUsed(clientPlan, weekStart, weekEnd, db),
    countConsumingReservationsInRange(
      clientPlan.clientId,
      clientPlan.id,
      planStart,
      planEnd,
      db
    ),
  ]);

  return buildAvailability({
    clientPlan,
    weeklyUsed,
    monthlyUsed,
    asOfDate: normalizedClassDate,
  });
}

export async function refreshPlanUsageCounters(clientPlanId, connection = null) {
  const db = resolveConnection(connection);
  const clientPlan = await plansRepository.findClientPlanById(clientPlanId, db);

  if (!clientPlan) {
    return null;
  }

  const today = getTodayInArgentina();
  const weekStart = getWeekStartDate(today);
  const weekEnd = addDaysToDate(weekStart, 6);
  const { planStart, planEnd } = getPlanPeriodRange(clientPlan);

  const [weeklyUsed, monthlyUsed] = await Promise.all([
    countWeeklySlotsUsed(clientPlan, weekStart, weekEnd, db),
    countConsumingReservationsInRange(
      clientPlan.clientId,
      clientPlan.id,
      planStart,
      planEnd,
      db
    ),
  ]);

  await plansRepository.updateClientPlanUsage(
    clientPlanId,
    {
      weeklyClassesUsed: weeklyUsed,
      monthlyClassesUsed: monthlyUsed,
      weekResetAt: weekStart,
      monthResetAt: planStart,
    },
    db
  );

  const availability = buildAvailability({
    clientPlan,
    weeklyUsed,
    monthlyUsed,
    asOfDate: today,
  });

  return {
    ...clientPlan,
    weeklyClassesUsed: weeklyUsed,
    monthlyClassesUsed: monthlyUsed,
    weekResetAt: weekStart,
    monthResetAt: planStart,
    catchUpSlots: availability.catchUpSlots,
    availability: getPlanAvailability({
      ...clientPlan,
      weeklyClassesUsed: weeklyUsed,
      monthlyClassesUsed: monthlyUsed,
      catchUpSlots: availability.catchUpSlots,
      status: 'active',
    }),
  };
}

/** Refresca contadores de la semana actual y del cupo del abono. */
export async function syncClientPlanCounters(clientPlan, connection = null) {
  if (!clientPlan?.id) {
    return clientPlan;
  }

  return refreshPlanUsageCounters(clientPlan.id, connection);
}

/** Tras crear una reserva que consume plan: solo refresca contadores. */
export async function incrementClientPlanUsage(clientPlanId, connection = null) {
  const refreshed = await refreshPlanUsageCounters(clientPlanId, connection);

  if (!refreshed) {
    return null;
  }

  return {
    ok: true,
    clientPlan: refreshed,
  };
}

export async function decrementClientPlanUsage(clientPlanId, connection = null) {
  return refreshPlanUsageCounters(clientPlanId, connection);
}
