export function getTodayInArgentina() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date());
}

export const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

/**
 * Día calendario en Argentina a partir de un TIMESTAMP UTC almacenado.
 * Usar en filtros DATE(...) para no cruzar medianoche por zona.
 * Ejemplo: DATE(CONVERT_TZ(fm.created_at, '+00:00', '-03:00'))
 */
export function sqlDateInArgentina(columnSql) {
  return `DATE(CONVERT_TZ(${columnSql}, '+00:00', '-03:00'))`;
}

/** Normaliza DATE/DATETIME de MySQL a YYYY-MM-DD (evita claves ISO en JSON). */
export function toDateString(value) {
  if (!value) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const stringValue = String(value);

  if (stringValue.includes('T')) {
    return stringValue.slice(0, 10);
  }

  return stringValue.slice(0, 10);
}

export function addDaysToDate(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Semanas de vigencia de un abono a partir del cupo de clases.
 * Ej: 8 clases / 2 por semana = 4 semanas.
 */
export function getPlanDurationWeeks(plan) {
  const weekly = Number(plan?.weeklyClasses ?? plan?.weeklyClassesLimit ?? 0);
  const monthly = Number(plan?.monthlyClasses ?? plan?.monthlyClassesLimit ?? 0);

  if (weekly <= 0 || monthly <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(monthly / weekly));
}

/**
 * Calcula el fin de vigencia de un plan.
 * Clase suelta (≤1 sem y ≤1 total): durationDays inclusivo.
 * Abonos: vigencia = (cupo total ÷ cupo semanal) semanas inclusive.
 */
export function getPlanEndDate(startDate, plan) {
  const durationDays = Number(plan?.durationDays ?? 0);
  const weekly = Number(plan?.weeklyClasses ?? plan?.weeklyClassesLimit ?? 0);
  const monthly = Number(plan?.monthlyClasses ?? plan?.monthlyClassesLimit ?? 0);
  const isSingleClass = weekly <= 1 && monthly <= 1;

  if (isSingleClass) {
    return addDaysToDate(startDate, Math.max(durationDays - 1, 0));
  }

  const weeks = getPlanDurationWeeks({ weeklyClasses: weekly, monthlyClasses: monthly });
  // Inclusive: start=1 + (4*7 - 1) = día 28 de un ciclo de 4 semanas.
  return addDaysToDate(startDate, weeks * 7 - 1);
}

/**
 * Cantidad de semanas calendario (lun–dom) desde el inicio del plan hasta asOfDate (inclusive).
 */
export function countPlanWeeksElapsed(planStartDate, asOfDate) {
  const planStart = toDateString(planStartDate);
  const asOf = toDateString(asOfDate);

  if (!planStart || !asOf || asOf < planStart) {
    return 0;
  }

  const startWeek = getWeekStartDate(planStart);
  const asOfWeek = getWeekStartDate(asOf);

  if (asOfWeek < startWeek) {
    return 0;
  }

  let weeks = 0;
  let cursor = startWeek;

  while (cursor <= asOfWeek && weeks < 120) {
    weeks += 1;
    cursor = addDaysToDate(cursor, 7);
  }

  return weeks;
}

/**
 * Clases que “deberían” haberse usado hasta asOfDate según el ritmo semanal.
 * Sirve para liberar catch-up si el plan empezó en el pasado o sobraron cupos.
 */
export function getExpectedPlanUsageByDate(clientPlan, asOfDate) {
  const weekly = Number(clientPlan?.weeklyClassesLimit ?? 0);
  const monthly = Number(clientPlan?.monthlyClassesLimit ?? 0);

  if (monthly <= 0) {
    return 0;
  }

  if (weekly <= 0) {
    return monthly;
  }

  const weeks = countPlanWeeksElapsed(clientPlan.startDate, asOfDate);
  return Math.min(monthly, weeks * weekly);
}

export function getWeekStartDate(dateString = getTodayInArgentina()) {
  const date = new Date(`${dateString}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

export function getMonthStartDate(dateString = getTodayInArgentina()) {
  const [year, month] = dateString.split('-');
  return `${year}-${month}-01`;
}

export function getMonthEndDate(dateString = getTodayInArgentina()) {
  const date = new Date(`${dateString}T12:00:00`);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return lastDay.toISOString().slice(0, 10);
}

export function getIsoDayOfWeek(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function addMinutesToTime(timeString, minutes) {
  const [hours, mins] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`;
}

export function normalizeTime(timeString) {
  if (!timeString) return '00:00:00';
  if (timeString.length === 5) return `${timeString}:00`;
  return timeString.slice(0, 8);
}

export function formatTimeDisplay(timeString) {
  return normalizeTime(timeString).slice(0, 5);
}

export function getNowInArgentina() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })
  );
}

export function getClassDateTime(classDate, startTime) {
  return new Date(`${classDate}T${normalizeTime(startTime)}`);
}

export function getHoursUntilClass(classDate, startTime) {
  const classDateTime = getClassDateTime(classDate, startTime);
  const now = getNowInArgentina();
  return (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
}

export function canCancelClass(classDate, startTime, cancellationHours) {
  return getHoursUntilClass(classDate, startTime) >= cancellationHours;
}

export function getRecoveryExpiryDate(recoveryExpiresEndOfMonth, fromDate = getTodayInArgentina()) {
  if (recoveryExpiresEndOfMonth) {
    const date = new Date(`${fromDate}T12:00:00`);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return lastDay.toISOString().slice(0, 10);
  }

  return addDaysToDate(fromDate, 30);
}

export function getPlanAvailability(clientPlan) {
  if (!clientPlan || clientPlan.status !== 'active') {
    return {
      weeklyRemaining: 0,
      monthlyRemaining: 0,
      catchUpSlots: 0,
      canBook: false,
    };
  }

  const weeklyLimit = Number(clientPlan.weeklyClassesLimit || 0);
  const weeklyUsed = Number(clientPlan.weeklyClassesUsed || 0);
  const monthlyLimit = Number(clientPlan.monthlyClassesLimit || 0);
  const monthlyUsed = Number(clientPlan.monthlyClassesUsed || 0);
  const catchUpSlots = Math.max(0, Number(clientPlan.catchUpSlots || 0));
  const effectiveWeeklyLimit = weeklyLimit + catchUpSlots;
  const weeklyRemaining = effectiveWeeklyLimit - weeklyUsed;
  const monthlyRemaining = monthlyLimit - monthlyUsed;

  return {
    weeklyRemaining: Math.max(0, weeklyRemaining),
    monthlyRemaining: Math.max(0, monthlyRemaining),
    catchUpSlots,
    canBook: monthlyRemaining > 0 && weeklyRemaining > 0,
  };
}
