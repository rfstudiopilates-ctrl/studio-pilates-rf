export function getTodayInArgentina() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date());
}

export const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

/** Días que se retienen los horarios fijos tras vencer el plan (día 8 se liberan). */
export const FIXED_SCHEDULE_GRACE_DAYS = 7;

/** Diferencia en días calendario: later − earlier (puede ser negativa). */
export function diffDays(earlierDate, laterDate) {
  const earlier = toDateString(earlierDate);
  const later = toDateString(laterDate);
  if (!earlier || !later) {
    return null;
  }

  const a = new Date(`${earlier}T12:00:00`);
  const b = new Date(`${later}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Plan vencido (end_date < today) dentro de la ventana de gracia.
 * Día 1..7 tras el fin: se retienen horarios fijos para renovar. Día 8+: liberar fijos.
 */
export function getFixedScheduleGraceInfo(endDate, today = getTodayInArgentina()) {
  const end = toDateString(endDate);
  const asOf = toDateString(today);

  if (!end || !asOf) {
    return { inGrace: false, daysSinceExpiry: null, graceDaysRemaining: 0, graceEndsOn: null };
  }

  if (asOf <= end) {
    return {
      inGrace: false,
      daysSinceExpiry: 0,
      graceDaysRemaining: FIXED_SCHEDULE_GRACE_DAYS,
      graceEndsOn: addDaysToDate(end, FIXED_SCHEDULE_GRACE_DAYS),
    };
  }

  const daysSinceExpiry = diffDays(end, asOf);
  const graceEndsOn = addDaysToDate(end, FIXED_SCHEDULE_GRACE_DAYS);
  const inGrace = daysSinceExpiry > 0 && daysSinceExpiry <= FIXED_SCHEDULE_GRACE_DAYS;
  const graceDaysRemaining = inGrace ? Math.max(0, FIXED_SCHEDULE_GRACE_DAYS - daysSinceExpiry + 1) : 0;

  return { inGrace, daysSinceExpiry, graceDaysRemaining, graceEndsOn };
}

/** true si el plan está activo y puede usarse para reservar. */
export function isClientPlanBookable(clientPlan) {
  return Boolean(clientPlan && clientPlan.status === 'active');
}

/** Última fecha inclusive en la que se puede tomar clase con ese abono (solo plan activo). */
export function getClientPlanBookableUntil(clientPlan) {
  return toDateString(clientPlan?.endDate) || '';
}

export function isPastFixedScheduleGrace(endDate, today = getTodayInArgentina()) {
  const end = toDateString(endDate);
  const asOf = toDateString(today);
  if (!end || !asOf) {
    return false;
  }

  const daysSinceExpiry = diffDays(end, asOf);
  return daysSinceExpiry != null && daysSinceExpiry > FIXED_SCHEDULE_GRACE_DAYS;
}

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
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    // El pool MySQL usa timezone '+00:00': un DATE llega como medianoche UTC.
    // Hay que leer componentes UTC; getFullYear/getDate() locales atrasan 1 día en AR.
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const stringValue = String(value).trim();

  // Ya viene como YYYY-MM-DD o ISO (…T…)
  if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
    return stringValue.slice(0, 10);
  }

  const parsed = new Date(stringValue);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getUTCFullYear();
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const day = String(parsed.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

/** Suma días a una fecha calendario YYYY-MM-DD sin desfases por zona horaria. */
export function addDaysToDate(dateString, days) {
  const normalized = toDateString(dateString);
  if (!normalized || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const [year, month, day] = normalized.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + Number(days || 0));
  return utc.toISOString().slice(0, 10);
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
 * Comparar solo contra uso hasta asOfDate (no contra fijos futuros).
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
  const normalized = toDateString(dateString) || getTodayInArgentina();
  const [year, month, day] = normalized.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const jsDay = utc.getUTCDay(); // 0=domingo
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc.toISOString().slice(0, 10);
}

export function getMonthStartDate(dateString = getTodayInArgentina()) {
  const [year, month] = (toDateString(dateString) || dateString).split('-');
  return `${year}-${month}-01`;
}

export function getMonthEndDate(dateString = getTodayInArgentina()) {
  const normalized = toDateString(dateString) || dateString;
  const [year, month] = normalized.split('-').map(Number);
  // Día 0 del mes siguiente = último día del mes actual (UTC).
  const lastDay = new Date(Date.UTC(year, month, 0));
  return lastDay.toISOString().slice(0, 10);
}

export function getIsoDayOfWeek(dateString) {
  const normalized = toDateString(dateString);
  if (!normalized || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const [year, month, day] = normalized.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const jsDay = utc.getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
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

/** Fecha y hora actuales en Argentina (HH:mm). */
export function getNowPartsInArgentina() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const get = (type) => parts.find((part) => part.type === type)?.value || '00';

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
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
    const normalized = toDateString(fromDate) || fromDate;
    const [year, month] = normalized.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0));
    return lastDay.toISOString().slice(0, 10);
  }

  return addDaysToDate(fromDate, 30);
}

export function getPlanAvailability(clientPlan) {
  const cancellationsLimit = Math.max(
    0,
    Number(clientPlan?.cancellationsLimit ?? 5)
  );
  const cancellationsUsed = Math.max(0, Number(clientPlan?.cancellationsUsed || 0));
  const cancellationsRemaining = Math.max(0, cancellationsLimit - cancellationsUsed);

  if (!clientPlan || !isClientPlanBookable(clientPlan)) {
    return {
      weeklyRemaining: 0,
      monthlyRemaining: 0,
      catchUpSlots: 0,
      expectedUsed: 0,
      usedForCatchUp: 0,
      weeklyUsed: 0,
      monthlyUsed: 0,
      effectiveWeeklyLimit: 0,
      canBook: false,
      cancellationsUsed,
      cancellationsLimit,
      cancellationsRemaining: 0,
      canCancelWithQuotaReturn: false,
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
    expectedUsed: Math.max(0, Number(clientPlan.expectedUsed || 0)),
    usedForCatchUp: Math.max(0, Number(clientPlan.usedForCatchUp || 0)),
    weeklyUsed,
    monthlyUsed,
    effectiveWeeklyLimit,
    canBook: monthlyRemaining > 0 && weeklyRemaining > 0,
    cancellationsUsed,
    cancellationsLimit,
    cancellationsRemaining,
    canCancelWithQuotaReturn: cancellationsRemaining > 0,
  };
}
