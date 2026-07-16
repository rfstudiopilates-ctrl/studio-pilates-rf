export const REPORT_TYPES = [
  { value: 'summary', label: 'Resumen general' },
  { value: 'clients', label: 'Clientes' },
  { value: 'finances', label: 'Ingresos y finanzas' },
  { value: 'occupancy', label: 'Ocupación de clases' },
  { value: 'reservations', label: 'Reservas' },
  { value: 'plans', label: 'Planes más usados' },
  { value: 'schedules', label: 'Horarios más usados' },
  { value: 'recoveries', label: 'Recuperaciones' },
];

export const PERIOD_OPTIONS = [
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: '30d', label: 'Últimos 30 días' },
];

export const CLIENT_STATUS_LABELS = {
  active: 'Activos',
  debt: 'Con deuda',
  suspended: 'Suspendidos',
};

export const RESERVATION_STATUS_LABELS = {
  confirmed: 'Confirmadas',
  pending: 'Pendientes',
  cancelled: 'Canceladas',
  completed: 'Completadas',
  no_show: 'Ausentes',
};

export const RECOVERY_STATUS_LABELS = {
  available: 'Disponibles',
  used: 'Usadas',
  expired: 'Vencidas',
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
