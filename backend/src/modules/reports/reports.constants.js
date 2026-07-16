export const REPORT_TYPES = {
  SUMMARY: 'summary',
  CLIENTS: 'clients',
  FINANCES: 'finances',
  OCCUPANCY: 'occupancy',
  RESERVATIONS: 'reservations',
  PLANS: 'plans',
  SCHEDULES: 'schedules',
  RECOVERIES: 'recoveries',
};

export const EXPORT_FORMATS = {
  PDF: 'pdf',
  XLSX: 'xlsx',
};

export const REPORT_TYPE_LABELS = {
  [REPORT_TYPES.SUMMARY]: 'Resumen general',
  [REPORT_TYPES.CLIENTS]: 'Clientes',
  [REPORT_TYPES.FINANCES]: 'Ingresos y finanzas',
  [REPORT_TYPES.OCCUPANCY]: 'Ocupación de clases',
  [REPORT_TYPES.RESERVATIONS]: 'Reservas',
  [REPORT_TYPES.PLANS]: 'Planes más usados',
  [REPORT_TYPES.SCHEDULES]: 'Horarios más usados',
  [REPORT_TYPES.RECOVERIES]: 'Recuperaciones',
};

export const CLIENT_STATUS_LABELS = {
  active: 'Activo',
  debt: 'Con deuda',
  suspended: 'Suspendido',
};

export const RESERVATION_STATUS_LABELS = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
  completed: 'Completada',
  no_show: 'Ausente',
};

export const RECOVERY_STATUS_LABELS = {
  available: 'Disponible',
  used: 'Usada',
  expired: 'Vencida',
};

export const DAY_LABELS = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};
