export function getTodayInArgentina() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date());
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
 * Fin de vigencia del plan.
 * Clase suelta: durationDays inclusive.
 * Abonos: (cupo total ÷ cupo semanal) semanas inclusive.
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
  return addDaysToDate(startDate, weeks * 7 - 1);
}

export function getWeekStartDate(dateString = getTodayInArgentina()) {
  const date = new Date(`${dateString}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

export function normalizeDateInput(value) {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const stringValue = String(value);

  if (stringValue.includes('T')) {
    return stringValue.slice(0, 10);
  }

  return stringValue;
}

export function formatDateDisplay(dateInput) {
  const dateString = normalizeDateInput(dateInput);

  if (!dateString) {
    return '-';
  }

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date);
}

/** Fecha y hora en zona Argentina (para created_at, last_login, etc.). */
export function formatDateTime(value, options = {}) {
  if (!value) {
    return '—';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
    ...options,
  }).format(date);
}

/** Solo fecha a partir de un instante (TIMESTAMP), en zona Argentina. */
export function formatDateTimeDateOnly(value) {
  if (!value) {
    return '—';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date);
}

export function formatWeekRange(from, to) {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  const formatter = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function formatMonthYear(dateString = getTodayInArgentina()) {
  const date = new Date(`${normalizeDateInput(dateString)}T12:00:00`);
  return new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date);
}

export function getMonthStartDate(dateString = getTodayInArgentina()) {
  const date = new Date(`${normalizeDateInput(dateString)}T12:00:00`);
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

export function getMonthEndDate(dateString = getTodayInArgentina()) {
  const date = new Date(`${normalizeDateInput(dateString)}T12:00:00`);
  date.setMonth(date.getMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
}

export function addMonthsToDate(dateString, months) {
  const date = new Date(`${normalizeDateInput(dateString)}T12:00:00`);
  date.setMonth(date.getMonth() + months, 1);
  return date.toISOString().slice(0, 10);
}

export function getMonthCalendarDays(monthStart) {
  const start = normalizeDateInput(monthStart);
  const first = new Date(`${start}T12:00:00`);
  const year = first.getFullYear();
  const month = first.getMonth();
  const firstWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const gridStart = addDaysToDate(start, -firstWeekday);
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const date = addDaysToDate(gridStart, index);
    const current = new Date(`${date}T12:00:00`);
    return {
      date,
      day: current.getDate(),
      inCurrentMonth: current.getMonth() === month,
    };
  });
}

export function timeToMinutes(time) {
  if (!time) return 0;
  const [hours, minutes] = String(time).slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
}

/** Fecha y hora actuales en Argentina (YYYY-MM-DD / HH:mm). */
export function getNowPartsInArgentina() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
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

/** True si la clase ya empezó o es de un día anterior (hora Argentina). */
export function isClassPast(classDate, startTime, now = getNowPartsInArgentina()) {
  const date = normalizeDateInput(classDate);

  if (!date) {
    return true;
  }

  if (date < now.date) {
    return true;
  }

  if (date > now.date) {
    return false;
  }

  return timeToMinutes(startTime) <= timeToMinutes(now.time);
}

export function getIsoWeekday(dateString) {
  const date = new Date(`${normalizeDateInput(dateString)}T12:00:00`);
  const day = date.getDay();
  return day === 0 ? 7 : day;
}
