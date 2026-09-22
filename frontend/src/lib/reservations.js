import { getNowPartsInArgentina, isClassEnded, normalizeDateInput } from './dates';

const ACTIVE_RESERVATION_STATUSES = new Set(['pending', 'confirmed']);

/**
 * Reserva pendiente/confirmada cuya clase todavía no terminó.
 * Misma regla en panel cliente y admin para que el conteo coincida.
 */
export function isActiveUpcomingReservation(reservation, now = getNowPartsInArgentina()) {
  if (!reservation || !ACTIVE_RESERVATION_STATUSES.has(reservation.status)) {
    return false;
  }

  const dateKey = normalizeDateInput(reservation.classDate);
  if (!dateKey) {
    return false;
  }

  const endTime = reservation.endTime || reservation.startTime;
  return !isClassEnded(dateKey, endTime, now);
}

export function filterActiveUpcomingReservations(reservations, now = getNowPartsInArgentina()) {
  return (reservations || []).filter((item) => isActiveUpcomingReservation(item, now));
}
