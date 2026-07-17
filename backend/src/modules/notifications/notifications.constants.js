export const NOTIFICATION_EVENTS = {
  NEW_RESERVATION: 'newReservation',
  PENDING_REQUEST: 'pendingRequest',
  CANCELLATION: 'cancellation',
  SCHEDULE_CHANGE: 'scheduleChange',
  RESERVATION_APPROVED: 'reservationApproved',
  REMINDER_24H: 'reminder24h',
  SCHEDULE_CHANGE_APPROVED: 'scheduleChangeApproved',
  PLAN_CANCELLED: 'planCancelled',
};

export const ADMIN_EVENT_MAP = {
  [NOTIFICATION_EVENTS.NEW_RESERVATION]: 'newReservation',
  [NOTIFICATION_EVENTS.PENDING_REQUEST]: 'pendingRequest',
  [NOTIFICATION_EVENTS.CANCELLATION]: 'cancellation',
  [NOTIFICATION_EVENTS.SCHEDULE_CHANGE]: 'scheduleChange',
};

export const CLIENT_EVENT_MAP = {
  [NOTIFICATION_EVENTS.RESERVATION_APPROVED]: 'reservationApproved',
  [NOTIFICATION_EVENTS.REMINDER_24H]: 'reminder24h',
  [NOTIFICATION_EVENTS.CANCELLATION]: 'cancellation',
  [NOTIFICATION_EVENTS.SCHEDULE_CHANGE_APPROVED]: 'scheduleChangeApproved',
  [NOTIFICATION_EVENTS.PLAN_CANCELLED]: 'planCancelled',
};
