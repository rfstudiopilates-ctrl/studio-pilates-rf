import { FIXED_SCHEDULE_GRACE_DAYS } from '../../utils/dates.js';

export const RESERVATION_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];

export const RESERVATION_STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  no_show: 'Ausente',
};

export const BOOKING_TYPES = ['standard', 'recovery', 'recurring', 'drop_in'];

export const BOOKING_TYPE_LABELS = {
  standard: 'Estándar',
  recovery: 'Recuperación',
  recurring: 'Recurrente',
  drop_in: 'Clase puntual',
};

export const RECURRING_STATUSES = ['active', 'paused', 'cancelled'];

export const RECOVERY_CREDIT_STATUSES = ['available', 'used', 'expired'];

export const ACTIVE_RESERVATION_STATUSES = ['pending', 'confirmed'];

/** Motivo al pausar un fijo: processRecurring puede reactivar esas reservas. */
export const PAUSED_RECURRING_CANCELLATION_REASON = 'Horario fijo pausado';

export const CANCELLED_RECURRING_CANCELLATION_REASON = 'Horario fijo cancelado';

/** Liberación de cupo al reequilibrar fijos tras un cambio de turno. */
export const FIXED_SCHEDULE_REBALANCE_REASON = 'Ajuste de horarios fijos';

export const PLAN_CANCELLED_REASON = 'Plan cancelado';

export const PLAN_EXPIRED_GRACE_RELEASE_REASON =
  `Plan vencido: horarios fijos liberados tras ${FIXED_SCHEDULE_GRACE_DAYS} días de gracia`;

export const CLIENT_DEACTIVATED_REASON = 'Cliente desactivado';

export const CLIENT_DEACTIVATED_RECURRING_CLEANUP_REASON =
  'Cliente desactivado (limpieza de horario fijo)';

/**
 * Máximo de cancelaciones del cliente con devolución de cupo (catch-up)
 * por cada asignación de plan (client_plans).
 */
export const MAX_PLAN_QUOTA_CANCELLATIONS = 5;

/**
 * Marcador en la clase origen tras un cambio de horario.
 * Evita cupo semanal fantasma del fijo y que processRecurring recree ese día.
 */
export const SCHEDULE_CHANGE_VACATED_REASON = 'Cambio de horario';

/**
 * Cancelaciones de sistema que SÍ se pueden reactivar al volver a materializar un fijo.
 * No incluye cancelaciones puntuales del cliente ni marcadores de cambio de horario.
 */
export const REACTIVATABLE_SYSTEM_CANCELLATION_REASONS = [
  PAUSED_RECURRING_CANCELLATION_REASON,
  CANCELLED_RECURRING_CANCELLATION_REASON,
  PLAN_CANCELLED_REASON,
  PLAN_EXPIRED_GRACE_RELEASE_REASON,
  CLIENT_DEACTIVATED_REASON,
  CLIENT_DEACTIVATED_RECURRING_CLEANUP_REASON,
];
