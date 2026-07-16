export const PLAN_STATUS_LABELS = {
  active: 'Activo',
  inactive: 'Inactivo',
};

export const PLAN_STATUS_STYLES = {
  active: 'bg-emerald-50 text-success border-emerald-100',
  inactive: 'bg-surface-muted text-text-muted border-border',
};

export const CLIENT_PLAN_STATUS_LABELS = {
  active: 'Activo',
  expired: 'Vencido',
  cancelled: 'Cancelado',
};

export const MOVEMENT_TYPE_LABELS = {
  payment: 'Pago',
  debt: 'Deuda',
  credit: 'Crédito',
  debit: 'Débito / Devolución',
};

export const MOVEMENT_TYPE_STYLES = {
  payment: 'text-success',
  debt: 'text-danger',
  credit: 'text-success',
  debit: 'text-warning',
};

export { formatCurrency } from '../lib/currency';

/** Planes con más de 3 clases mensuales pueden tener horarios fijos. */
export const FIXED_SCHEDULE_MIN_MONTHLY_CLASSES = 3;

export function getPlanMonthlyClasses(plan) {
  return Number(plan?.monthlyClassesLimit ?? plan?.monthlyClasses ?? 0);
}

export function getPlanWeeklyClasses(plan) {
  return Number(plan?.weeklyClassesLimit ?? plan?.weeklyClasses ?? 0);
}

export function planAllowsFixedSchedules(plan) {
  return getPlanMonthlyClasses(plan) > FIXED_SCHEDULE_MIN_MONTHLY_CLASSES;
}

export function getFixedScheduleSlotLimit(plan) {
  return getPlanWeeklyClasses(plan);
}
