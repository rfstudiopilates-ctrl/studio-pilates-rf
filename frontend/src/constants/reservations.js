export const RESERVATION_STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  no_show: 'Ausente',
};

export const BOOKING_TYPE_LABELS = {
  standard: 'Estándar',
  recovery: 'Recuperación',
  recurring: 'Horario fijo',
  drop_in: 'Clase puntual',
};

export const RECURRING_STATUS_LABELS = {
  active: 'Activo',
  paused: 'Pausado',
  cancelled: 'Cancelado',
};

export const RESERVATION_STATUS_STYLES = {
  pending: 'border-amber-100 bg-amber-50 text-warning',
  confirmed: 'border-emerald-100 bg-emerald-50 text-success',
  cancelled: 'border-red-100 bg-red-50 text-danger',
  completed: 'border-border bg-white text-text-muted',
  no_show: 'border-border bg-surface-muted text-text-muted',
};

export const RECURRING_STATUS_STYLES = {
  active: 'border-emerald-100 bg-emerald-50 text-success',
  paused: 'border-amber-100 bg-amber-50 text-warning',
  cancelled: 'border-red-100 bg-red-50 text-danger',
};
